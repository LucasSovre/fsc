import Link from "next/link";
import { Temporal } from "temporal-polyfill";
import { requireUser } from "../../server/session";
import { listEvents, settings } from "../../server/calendar";
import { dayInstant } from "../../server/validation";
import { EventList } from "../components/event-list";
export default async function Page({ searchParams }: { searchParams: Promise<{ mois?: string; jour?: string; page?: string }> }) {
  const user = await requireUser(), { profile } = await settings(user.id), query = await searchParams;
  const today = Temporal.Now.plainDateISO(profile.timeZone);
  let month = today.toPlainYearMonth(), selected = today;
  try { if (query.mois) month = Temporal.PlainYearMonth.from(query.mois); } catch { /* Current month. */ }
  try { if (query.jour) selected = Temporal.PlainDate.from(query.jour); else selected = month.toPlainDate({ day: today.toPlainYearMonth().equals(month) ? today.day : 1 }); } catch { selected = month.toPlainDate({ day: 1 }); }
  month = selected.toPlainYearMonth();
  const first = month.toPlainDate({ day: 1 }), gridStart = first.subtract({ days: first.dayOfWeek - 1 });
  const monthTitle = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T12:00:00Z`));
  const day = selected.toString();
  const result = await listEvents(user.id, { from: dayInstant(day, profile.timeZone), to: dayInstant(selected.add({ days: 1 }).toString(), profile.timeZone), cursor: query.page });
  return <><h1>Calendrier</h1>
    <nav aria-label="Navigation des mois"><Link href={`/calendrier?mois=${month.subtract({ months: 1 })}`}>Mois précédent</Link>{" · "}<Link href="/calendrier">Aujourd’hui</Link>{" · "}<Link href={`/calendrier?mois=${month.add({ months: 1 })}`}>Mois suivant</Link></nav>
    <table><caption>{monthTitle}</caption><thead><tr>{["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => <th scope="col" key={d}>{d}</th>)}</tr></thead><tbody>
      {Array.from({ length: Math.ceil((first.dayOfWeek - 1 + month.daysInMonth) / 7) }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, index) => {
        const date = gridStart.add({ days: week * 7 + index });
        return <td key={index}>{date.month === month.month ? <Link href={`/calendrier?jour=${date}`} aria-current={date.equals(selected) ? "date" : undefined} aria-label={`${date}${date.equals(today) ? ", aujourd’hui" : ""}`}>{date.equals(selected) ? <strong>{date.day}</strong> : date.day}</Link> : " "}</td>;
      })}</tr>)}
    </tbody></table>
    <h2>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</h2>
    <p><Link href={`/evenements/nouveau?jour=${day}`}>Créer un événement ce jour</Link></p><EventList events={result.events} zone={profile.timeZone} />
    {result.nextCursor && <p><Link href={`/calendrier?jour=${day}&page=${result.nextCursor}`}>Événements suivants de ce jour</Link></p>}
  </>;
}
