import { notFound } from "next/navigation";
import { requireUser } from "../../../../server/session";
import { getEvent, settings } from "../../../../server/calendar";
import { DomainError } from "../../../../server/validation";
import { EventForm } from "../../../components/event-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(), { id } = await params;
  const event = await getEvent(user.id, id).catch(error => { if (error instanceof DomainError && error.status === 404) notFound(); throw error; });
  const state = await settings(user.id);
  return <><h1>Modifier l’événement</h1><EventForm event={event} zone={state.profile.timeZone} tags={state.tags} canCommon={state.calendars.some(c => c.kind === "common")} creator={event.creatorId === user.id} /></>;
}
