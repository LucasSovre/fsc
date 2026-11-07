import { createHash } from "node:crypto";
import ICAL from "ical.js";
import { Temporal } from "temporal-polyfill";
import { MAX_CALENDAR_BYTES } from "./calendar-source";
import { dateValue, dayInstant, DomainError, eventDates, eventSchema, zoneSchema } from "./validation";
import type { EventInput } from "./validation";

type Component = InstanceType<typeof ICAL.Component>;
type Time = InstanceType<typeof ICAL.Time>;
type Zone = InstanceType<typeof ICAL.Timezone>;
export type SourceEvent = { key: string; input: EventInput };
export const MAX_SOURCE_EVENTS = 5000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const text = (component: Component, name: string) => String(component.getFirstPropertyValue(name) ?? "");

export function parseCalendarSource(source: string, options: { timeZone: string; from: string; to: string }): SourceEvent[] {
  if (Buffer.byteLength(source, "utf8") > MAX_CALENDAR_BYTES) throw new DomainError("Ce calendrier dépasse la limite de 2 Mo.");
  const zone = zoneSchema.parse(options.timeZone), from = dateValue(options.from), to = dateValue(options.to);
  const endDate = Temporal.PlainDate.from(to).add({ days: 1 }).toString();
  const fromInstant = dayInstant(from, zone), untilInstant = dayInstant(endDate, zone);
  if (from > to) throw new DomainError("Période du calendrier invalide.");
  try {
    const root = ICAL.Component.fromString(source.replace(/^\uFEFF/, ""));
    if (root.name !== "vcalendar" || text(root, "version") !== "2.0" || !["", "PUBLISH"].includes(text(root, "method").toUpperCase())) throw new Error("invalid calendar");
    const components = root.getAllSubcomponents("vevent");
    if (components.length > MAX_SOURCE_EVENTS) throw new DomainError("Ce calendrier contient trop d’événements (5 000 maximum).");
    const nativeZone = root.getTimeZoneByID.bind(root), zones = new Map<string, Zone>();
    const ianaZone = (id: string) => {
      if (zones.has(id)) return zones.get(id)!;
      if (!zoneSchema.safeParse(id).success) throw new DomainError("Un fuseau horaire du calendrier est inconnu et ne contient pas de définition VTIMEZONE.");
      const result = new ICAL.Timezone({ tzid: id });
      result.utcOffset = (time: Time) => {
        const wall = Temporal.PlainDateTime.from({ year: time.year, month: time.month, day: time.day, hour: time.hour, minute: time.minute, second: time.second });
        return (wall.toZonedDateTime("UTC").epochMilliseconds - wall.toZonedDateTime(id, { disambiguation: "compatible" }).epochMilliseconds) / 1000;
      };
      zones.set(id, result);
      return result;
    };
    // A per-file resolver avoids leaking imported timezone definitions across accounts.
    root.getTimeZoneByID = id => nativeZone(id) ?? ianaZone(id);
    const instant = (time: Time) => {
      const clone = time.clone();
      if (clone.zone.tzid === "floating") clone.zone = ianaZone(zone);
      return new Date(clone.toUnixTime() * 1000);
    };
    const groups = new Map<string, Component[]>();
    for (const component of components) {
      const uid = text(component, "uid");
      if (!uid) throw new DomainError("Un événement n’a pas d’identifiant UID. Le calendrier source doit en fournir un pour permettre les mises à jour.");
      if (component.getFirstProperty("recurrence-id")?.getParameter("range")) throw new DomainError("Les modifications de récurrence THISANDFUTURE ne sont pas prises en charge.");
      for (const name of ["dtstart", "dtend", "recurrence-id", "exdate", "rdate"]) {
        for (const property of component.getAllProperties(name)) {
          for (const value of property.toJSON().slice(3)) {
            if (typeof value !== "string") throw new DomainError("Un format de date de récurrence du calendrier n’est pas pris en charge.");
            if (property.type === "date") Temporal.PlainDate.from(value);
            else Temporal.PlainDateTime.from(value.replace(/Z$/, ""));
          }
        }
      }
      groups.set(uid, [...(groups.get(uid) ?? []), component]);
    }
    const result = new Map<string, SourceEvent>();
    const add = (uid: string, component: Component, start: Time, end: Time, recurrenceId?: Time) => {
      if (text(component, "status").toUpperCase() === "CANCELLED") return;
      if (!start || !end || start.isDate !== end.isDate) throw new Error("invalid dates");
      const allDay = start.isDate;
      const startAt = allDay ? null : instant(start), endAt = allDay ? null : instant(end);
      const startDate = allDay ? dateValue(start.toString()) : null, finishDate = allDay ? dateValue(end.toString()) : null;
      if (allDay ? startDate! >= endDate || finishDate! <= from : startAt! >= untilInstant || endAt! <= fromInstant) return;
      const timeZone = zoneSchema.safeParse(start.zone.tzid).success ? start.zone.tzid : start.zone.tzid === "floating" ? zone : "UTC";
      const input = eventSchema.parse({
        visibility: "solo", title: text(component, "summary") || "Sans titre", description: text(component, "description"), location: text(component, "location"),
        tags: [...new Set(component.getAllProperties("categories").flatMap(property => property.getValues()).map(String).filter(Boolean))],
        temporalData: allDay ? { allDay: true, startDate, endDate: finishDate } : { allDay: false, start: startAt!.toISOString(), end: endAt!.toISOString(), timeZone },
      });
      eventDates(input.temporalData, zone);
      const key = hash(JSON.stringify([uid, recurrenceId ? recurrenceId.isDate ? recurrenceId.toString() : instant(recurrenceId).toISOString() : "single"]));
      result.set(key, { key, input });
      if (result.size > MAX_SOURCE_EVENTS) throw new DomainError("La période contient plus de 5 000 événements ou occurrences.");
    };
    const latest = (items: Component[]) => items.sort((a, b) => Number(b.getFirstPropertyValue("sequence") ?? 0) - Number(a.getFirstPropertyValue("sequence") ?? 0) || text(b, "last-modified").localeCompare(text(a, "last-modified")))[0];
    let iterations = 0;
    for (const [uid, items] of groups) {
      const master = latest(items.filter(component => !component.hasProperty("recurrence-id")));
      const exceptions = new Map<string, Component[]>();
      for (const component of items.filter(item => item.hasProperty("recurrence-id"))) {
        const id = text(component, "recurrence-id");
        exceptions.set(id, [...(exceptions.get(id) ?? []), component]);
      }
      const related = [...exceptions.values()].map(latest);
      const recurrenceKey = (time: Time) => time.isDate ? time.toString() : instant(time).toISOString();
      const cancelled = new Set(related.filter(component => text(component, "status").toUpperCase() === "CANCELLED").map(component => {
        const id = component.getFirstPropertyValue("recurrence-id");
        if (!(id instanceof ICAL.Time)) throw new Error("invalid recurrence ID");
        return recurrenceKey(id);
      }));
      if (master && text(master, "status").toUpperCase() !== "CANCELLED") {
        const event = new ICAL.Event(master, { exceptions: related.filter(component => text(component, "status").toUpperCase() !== "CANCELLED"), strictExceptions: true });
        if (!master.hasProperty("dtstart")) throw new Error("missing start");
        if (!event.isRecurring()) add(uid, master, event.startDate, event.endDate);
        else {
          for (const property of master.getAllProperties("rrule")) {
            const rule = property.getFirstValue();
            if (!(rule instanceof ICAL.Recur) || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(rule.freq) || (["BYSECOND", "BYMINUTE", "BYHOUR"] as const).some(part => (rule.parts[part]?.length ?? 0) > 1))
              throw new DomainError("Une récurrence trop fréquente ou complexe n’est pas prise en charge.");
          }
          const iterator = event.iterator();
          for (let occurrence = iterator.next(); occurrence; occurrence = iterator.next()) {
            if (++iterations > 50000) throw new DomainError("Les récurrences de ce calendrier sont trop volumineuses à développer.");
            if (occurrence.isDate ? occurrence.toString() >= endDate : instant(occurrence) >= untilInstant) break;
            if (cancelled.has(recurrenceKey(occurrence))) continue;
            const details = event.getOccurrenceDetails(occurrence);
            add(uid, details.item.component, details.startDate, details.endDate, occurrence);
          }
        }
      }
      // Detached/moved exceptions may fall inside the period even when their original date does not.
      if (!master || text(master, "status").toUpperCase() !== "CANCELLED") for (const component of related) {
        if (text(component, "status").toUpperCase() === "CANCELLED") continue;
        const event = new ICAL.Event(component);
        add(uid, component, event.startDate, event.endDate, event.recurrenceId);
      }
    }
    return [...result.values()];
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("Le calendrier ICS contient un événement ou une date invalide. Aucune donnée existante n’a été modifiée.");
  }
}
