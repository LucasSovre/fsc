import { notFound } from "next/navigation";
import { requireUser } from "../../../../server/session";
import { getEvent, getEventReminder, settings } from "../../../../server/calendar";
import { DomainError } from "../../../../server/validation";
import { listAttachments } from "../../../../server/attachments";
import { EventForm } from "../../../components/event-form";
import Link from "next/link";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(), { id } = await params;
  const event = await getEvent(user.id, id).catch(error => { if (error instanceof DomainError && error.status === 404) notFound(); throw error; });
  if (event.linkedCalendarId) return <><h1>Événement lié</h1><p>Modifie cet événement dans son calendrier source. Tu peux personnaliser ton rappel depuis sa fiche FSC.</p><Link href={`/evenements/${id}`}>Revenir à l’événement</Link></>;
  const state = await settings(user.id);
  const reminder = await getEventReminder(user.id, id);
  return <><h1>Modifier l’événement</h1><EventForm event={event} attachments={await listAttachments(id)} zone={state.profile.timeZone} tags={state.tags} canCommon={state.calendars.some(c => c.kind === "common")} creator={event.creatorId === user.id} reminder={reminder} reminderDefaults={state.profile} /></>;
}
