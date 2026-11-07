import Link from "next/link";
import { Temporal } from "temporal-polyfill";
import { requireUser } from "../../server/session";
import { listEvents, settings } from "../../server/calendar";
import { dayInstant, localDate } from "../../server/validation";
import { EventList } from "../components/event-list";
import { MonthSwipe } from "../components/month-swipe";
import { listTravelDays } from "../../server/travel";
import { TravelCalendar, TravelForm } from "../components/travel-calendar";
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
  const travelDays = await listTravelDays(user.id, { startDate: first.toString(), endDate: first.with({ day: month.daysInMonth }).toString() });
  const previousHref = `/calendrier?mois=${month.subtract({ months: 1 })}`;
  const nextHref = `/calendrier?mois=${month.add({ months: 1 })}`;
  const monthEvents = (await listEvents(user.id, { from: dayInstant(first.toString(), profile.timeZone), to: dayInstant(first.add({ months: 1 }).toString(), profile.timeZone), limit: 500 })).events;
  const marks = new Map<string, { common: number; solo: number }>();
  for (const event of monthEvents) {
    const start = Temporal.PlainDate.from(event.allDay ? event.startDate! : localDate(event.startsAt!, profile.timeZone));
    const last = Temporal.PlainDate.from(event.allDay ? event.endDate! : localDate(new Date(event.endsAt!.getTime() - 1), profile.timeZone)).subtract({ days: event.allDay ? 1 : 0 });
    for (let date = Temporal.PlainDate.compare(start, first) < 0 ? first : start; Temporal.PlainDate.compare(date, last) <= 0 && date.month === month.month; date = date.add({ days: 1 })) {
      const mark = marks.get(date.toString()) ?? { common: 0, solo: 0 };
      mark[event.visibility === "common" ? "common" : "solo"]++;
      marks.set(date.toString(), mark);
    }
  }
  const result = await listEvents(user.id, { from: dayInstant(day, profile.timeZone), to: dayInstant(selected.add({ days: 1 }).toString(), profile.timeZone), cursor: query.page });
  return <><h1>Calendrier</h1>
    <TravelCalendar key={user.id} userId={user.id} menu={<TravelForm day={day} />}>
    <div className="month-toolbar"><h2>{monthTitle}</h2>
      <nav className="month-nav" aria-label="Navigation des mois">
        <Link href={previousHref} transitionTypes={["swipe-prev"]} aria-label="Mois précédent" title="Mois précédent"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></Link>
        <Link href="/calendrier">Aujourd’hui</Link>
        <Link href={nextHref} transitionTypes={["swipe-next"]} aria-label="Mois suivant" title="Mois suivant"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></Link>
      </nav>
    </div>
    <MonthSwipe previousHref={previousHref} nextHref={nextHref}>
    <table className="calendar-grid"><caption className="sr-only">{monthTitle}</caption><thead><tr>{["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => <th scope="col" key={d}>{d}</th>)}</tr></thead><tbody>
      {Array.from({ length: Math.ceil((first.dayOfWeek - 1 + month.daysInMonth) / 7) }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, index) => {
        const date = gridStart.add({ days: week * 7 + index });
        const mark = marks.get(date.toString()), total = mark ? mark.common + mark.solo : 0;
        const travelers = travelDays.filter(travel => travel.day === date.toString());
        return <td key={index}>{date.month === month.month ? <Link href={`/calendrier?jour=${date}`} data-travel={travelers.length > 0} data-today={date.equals(today)} aria-current={date.equals(selected) ? "date" : undefined}>
          <span aria-hidden="true">{date.equals(selected) ? <strong>{date.day}</strong> : date.day}</span>
          {total > 0 && <span className="day-dots" aria-hidden="true">{mark!.common > 0 && <i data-visibility="common" />}{mark!.solo > 0 && <i data-visibility="solo" />}{total > 2 && <b>+</b>}</span>}
          <span className="sr-only">{`${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}${date.equals(today) ? ", aujourd’hui" : ""}${total > 0 ? `, ${total} événement${total > 1 ? "s" : ""}` : ""}`}</span>
          {travelers.length > 0 && <span className="sr-only travel-detail">{travelers.map(travel => `, ${travel.name} en déplacement`).join("")}</span>}
        </Link> : " "}</td>;
      })}</tr>)}
    </tbody></table>
    </MonthSwipe>
    <p className="grid-legend"><span><i className="day-dot" data-visibility="common" aria-hidden="true" /> Commun</span><span><i className="day-dot" data-visibility="solo" aria-hidden="true" /> Solo</span></p>
    <div className="day-heading"><h2>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</h2>
      <Link className="button-link day-add" href={`/evenements/nouveau?jour=${day}`}>Créer<span className="sr-only"> un événement ce jour</span></Link></div>
    <div className="travel-detail">{travelDays.filter(travel => travel.day === day).map(travel => <p className="travel-person" key={travel.userId}>{travel.name} en déplacement</p>)}</div>
    <EventList events={result.events} zone={profile.timeZone} />
    {result.nextCursor && <p><Link href={`/calendrier?jour=${day}&page=${result.nextCursor}`}>Événements suivants de ce jour</Link></p>}
    </TravelCalendar>
  </>;
}
