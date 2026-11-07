import { requireUser } from "../../../server/session";
import { settings } from "../../../server/calendar";
import { dateValue } from "../../../server/validation";
import { EventForm } from "../../components/event-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const user = await requireUser(), state = await settings(user.id), { jour } = await searchParams;
  let day: string | undefined;
  try { if (jour) day = dateValue(jour); } catch { /* Use today for an invalid optional date. */ }
  return <><h1>Créer un événement</h1><EventForm zone={state.profile.timeZone} tags={state.tags} canCommon={state.calendars.some(c => c.kind === "common")} creator day={day} reminderDefaults={state.profile} /></>;
}
