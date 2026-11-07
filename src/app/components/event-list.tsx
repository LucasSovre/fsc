import Link from "next/link";
import { Icon } from "./ui-icon";
import type { Event } from "../../server/types";
export function EventList({ events, zone }: { events: Event[]; zone: string }) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: zone });
  return events.length ? <ul className="event-list">{events.map(event => <li className="event-card" data-visibility={event.visibility} key={event.id}>
    <Link className="event-title" href={`/evenements/${event.id}`}><span>{event.title}</span><span className="event-arrow"><Icon name="arrow" /></span></Link><strong className="event-visibility">{event.visibility === "common" ? "Commun" : "Solo"}</strong><div className="event-time">
    {event.allDay ? `Journée entière · ${event.startDate} → ${event.endDate} (fin exclusive)` : <><time dateTime={event.startsAt!.toISOString()}>{formatter.format(event.startsAt!)}</time>{" → "}<time dateTime={event.endsAt!.toISOString()}>{formatter.format(event.endsAt!)}</time></>}
    </div>{event.tags.length > 0 && <p className="event-tags">Tags : {event.tags.join(", ")}</p>}
  </li>)}</ul> : <p className="empty-state">Aucun événement.</p>;
}
