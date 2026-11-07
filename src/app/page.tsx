import Link from "next/link";
import { requireUser } from "../server/session";
import { listEvents, settings } from "../server/calendar";
import { EventList } from "./components/event-list";
import { localDate } from "../server/validation";
export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const { profile } = await settings(user.id);
  const { page } = await searchParams;
  const now = new Date();
  const result = await listEvents(user.id, { from: now, to: new Date(now.getTime() + 365 * 86400_000), cursor: page });
  const today = localDate(now, profile.timeZone);
  const groups = Map.groupBy(result.events, event => {
    const date = event.allDay ? event.startDate! : localDate(event.startsAt!, profile.timeZone);
    return date < today ? today : date;
  });
  return <><h1>À venir</h1><p><Link className="button-link" href="/evenements/nouveau">Créer un événement</Link></p>
    <p className="page-intro">Événements en cours et à venir sur les douze prochains mois, communs et solo. Fuseau : {profile.timeZone}.</p>
    {!result.events.length && <p className="empty-state">Aucun événement à venir.</p>}
    {[...groups].map(([day, events]) => <section key={day}>
      <h2>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</h2>
      <EventList events={events} zone={profile.timeZone} />
    </section>)}
    {result.nextCursor && <p><Link href={`/?page=${result.nextCursor}`}>Événements suivants</Link></p>}
    {page && <p><Link href="/">Revenir au début</Link></p>}
  </>;
}
