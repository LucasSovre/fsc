import Link from "next/link";
import type { Event } from "../../server/types";
export function EventList({ events, zone }: { events: Event[]; zone: string }) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: zone });
  return events.length ? <ul>{events.map(event => <li key={event.id}>
    <Link href={`/evenements/${event.id}`}>{event.title}</Link>{" — "}<strong>{event.visibility === "common" ? "Commun" : "Solo"}</strong>{" — "}
    {event.allDay ? `Journée entière · ${event.startDate} → ${event.endDate} (fin exclusive)` : <><time dateTime={event.startsAt!.toISOString()}>{formatter.format(event.startsAt!)}</time>{" → "}<time dateTime={event.endsAt!.toISOString()}>{formatter.format(event.endsAt!)}</time></>}
    {event.tags.length > 0 && <span> · Tags : {event.tags.join(", ")}</span>}
  </li>)}</ul> : <p>Aucun événement.</p>;
}
