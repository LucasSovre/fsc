import Link from "next/link";
import { Icon } from "./ui-icon";
import { localDate } from "../../server/validation";
import type { Event } from "../../server/types";
const noon = (date: string) => new Date(`${date}T12:00:00Z`);
function dayLabel(date: string, withYear: boolean) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", ...(withYear && { year: "numeric" }), timeZone: "UTC" }).format(noon(date));
}
function eventWhen(event: Event, zone: string) {
  const thisYear = localDate(new Date(), zone).slice(0, 4);
  if (event.allDay) {
    const last = new Date(noon(event.endDate!).getTime() - 86400_000).toISOString().slice(0, 10);
    if (last <= event.startDate!) return <>{dayLabel(event.startDate!, event.startDate!.slice(0, 4) !== thisYear)} · toute la journée</>;
    const format = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", ...(event.startDate!.slice(0, 4) !== thisYear || last.slice(0, 4) !== thisYear ? { year: "numeric" as const } : {}), timeZone: "UTC" });
    return <>{format.formatRange(noon(event.startDate!), noon(last))} · toute la journée</>;
  }
  const hour = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: zone });
  const startDay = localDate(event.startsAt!, zone), endDay = localDate(event.endsAt!, zone);
  const stamp = (when: Date, day: string) => <time dateTime={when.toISOString()}>{startDay === endDay ? hour.format(when) : `${dayLabel(day, day.slice(0, 4) !== thisYear)} ${hour.format(when)}`}</time>;
  return startDay === endDay
    ? <>{dayLabel(startDay, startDay.slice(0, 4) !== thisYear)} · {stamp(event.startsAt!, startDay)} – {stamp(event.endsAt!, endDay)}</>
    : <>{stamp(event.startsAt!, startDay)} → {stamp(event.endsAt!, endDay)}</>;
}
export function EventList({ events, zone }: { events: Event[]; zone: string }) {
  return events.length ? <ul className="event-list">{events.map(event => <li className="event-card" data-visibility={event.visibility} key={event.id}>
    <Link className="event-title" href={`/evenements/${event.id}`}><span>{event.title}</span><span className="event-arrow"><Icon name="arrow" /></span></Link><strong className="event-visibility">{event.visibility === "common" ? "Commun" : "Solo"}</strong><div className="event-time">
    {eventWhen(event, zone)}
    </div>{event.tags.length > 0 && <p className="event-tags">Tags : {event.tags.join(", ")}</p>}
  </li>)}</ul> : <p className="empty-state">Aucun événement.</p>;
}
