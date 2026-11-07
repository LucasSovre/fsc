import Link from "next/link";
import { requireUser } from "../server/session";
import { listEvents, settings } from "../server/calendar";
import { Notice } from "./components/notice";
import { EventList } from "./components/event-list";
import { Temporal } from "temporal-polyfill";
import { localDate } from "../server/validation";
export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string; ok?: string }> }) {
  const user = await requireUser();
  const { profile } = await settings(user.id);
  const { page, ok } = await searchParams;
  const now = new Date();
  const result = await listEvents(user.id, { from: now, to: new Date(now.getTime() + 365 * 86400_000), cursor: page });
  const today = localDate(now, profile.timeZone);
  const groups = Map.groupBy(result.events, event => {
    const date = event.allDay ? event.startDate! : localDate(event.startsAt!, profile.timeZone);
    return date < today ? today : date;
  });
  const tomorrow = Temporal.PlainDate.from(today).add({ days: 1 }).toString();
  const dayTitle = (day: string) => {
    const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", ...(day.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }), timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
    return day === today ? `Aujourd’hui · ${date}` : day === tomorrow ? `Demain · ${date}` : date;
  };
  return <><h1>À venir</h1><Notice code={ok} />
    <p className="page-intro">Événements en cours et à venir sur les douze prochains mois, communs et solo.</p>
    {!result.events.length && <div className="empty-state"><p>Aucun événement à venir.</p><p><Link className="button-link" href="/evenements/nouveau">Créer un événement</Link></p></div>}
    {[...groups].map(([day, events]) => <section key={day}>
      <h2>{dayTitle(day)}</h2>
      <EventList events={events} zone={profile.timeZone} ongoingBefore={today} />
    </section>)}
    {result.nextCursor && <p><Link className="button-link button-secondary" href={`/?page=${result.nextCursor}`}>Voir la suite</Link></p>}
    {page && <p><Link className="button-link button-secondary" href="/">Revenir au début</Link></p>}
  </>;
}
