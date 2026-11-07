import ical, { ICalCalendarMethod } from "ical-generator";
import type { Calendar, Event } from "./types";

export function calendarICS(calendar: Calendar, events: Event[]) {
  const feed = ical({ name: `FSC — ${calendar.kind === "solo" ? "Solo" : "Commun"}`, method: ICalCalendarMethod.PUBLISH, prodId: { company: "FSC", product: "Fucking Simple Calendar", language: "FR" } });
  for (const event of events) {
    feed.createEvent({
      id: `${event.id}@fsc`, summary: event.title, description: event.description, location: event.location, url: event.link || undefined,
      start: event.allDay ? new Date(`${event.startDate}T00:00:00Z`) : event.startsAt!,
      end: event.allDay ? new Date(`${event.endDate}T00:00:00Z`) : event.endsAt!,
      allDay: event.allDay, sequence: event.version, created: event.createdAt, lastModified: event.updatedAt,
      categories: event.tags.map(name => ({ name })),
    });
  }
  return feed.toString();
}
