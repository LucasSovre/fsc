import Link from "next/link";
import { Icon } from "./ui-icon";
import { typeEmojis, typeLabels } from "./event-type";
import type { Event } from "../../server/types";
export function EventList({ events, zone }: { events: Event[]; zone: string }) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: zone });
  return events.length ? <ul className="event-list">{events.map(event => <li className="event-card" data-visibility={event.visibility} key={event.id}>
    <Link className="event-title" href={`/evenements/${event.id}`}><span>{event.title}</span><span className="event-arrow"><Icon name="arrow" /></span></Link><strong className="event-visibility">{event.visibility === "common" ? "Commun" : "Solo"}</strong>{event.type && <span className="event-type" data-type={event.type}><span aria-hidden="true">{typeEmojis[event.type]}</span> {typeLabels[event.type]}</span>}{event.type === "visio" && event.link && <a className="button-link event-join" href={event.link} target="_blank" rel="noopener noreferrer">Rejoindre</a>}<div className="event-time">
    {event.allDay ? `Journée entière · ${event.startDate} → ${event.endDate} (fin exclusive)` : <><time dateTime={event.startsAt!.toISOString()}>{formatter.format(event.startsAt!)}</time>{" → "}<time dateTime={event.endsAt!.toISOString()}>{formatter.format(event.endsAt!)}</time></>}
    </div>{event.tags.length > 0 && <p className="event-tags">Tags : {event.tags.join(", ")}</p>}
  </li>)}</ul> : <p className="empty-state">Aucun événement.</p>;
}
