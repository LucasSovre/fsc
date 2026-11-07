import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../server/session";
import { getEvent, getEventReminder, settings } from "../../../server/calendar";
import { DomainError } from "../../../server/validation";
import { ActionForm } from "../../components/action-form";
import { deleteEventAction, eventReminderAction } from "../../actions";
import { Notice } from "../../components/notice";
import { EventList } from "../../components/event-list";
import { EventReminderFields } from "../../components/event-reminder-fields";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const user = await requireUser(), { id } = await params, { ok } = await searchParams;
  const event = await getEvent(user.id, id).catch(error => { if (error instanceof DomainError && error.status === 404) notFound(); throw error; });
  const reminder = await getEventReminder(user.id, id), { profile } = await settings(user.id);
  const rights = event.linkedCalendarId ? "Cet événement est mis à jour depuis un calendrier lié. Pour le modifier ou le supprimer, utilise le calendrier source. Ton rappel personnel reste modifiable ci-dessous." : event.visibility === "common" ? "Vous pouvez tous les deux modifier et supprimer cet événement." : "Cet événement est privé. Toi seul peux le consulter et le modifier.";
  return <><h1>{event.title}</h1><Notice code={ok} /><EventList events={[event]} zone={event.timeZone} linked={false} />
    <p><Link className="button-link" href={event.linkedCalendarId ? "/calendriers-lies" : `/evenements/${event.id}/modifier`}>{event.linkedCalendarId ? "Voir les calendriers liés" : "Modifier"}</Link></p>
    {event.description.split("\n").map((line, i) => <p key={i}>{line}</p>)}
    <p className="field-help">{rights}</p>
    <details><summary>Rappel personnel</summary>
    <ActionForm action={eventReminderAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <EventReminderFields initial={reminder} defaults={profile} />
      <p className="field-help">Un rappel déjà envoyé n’est pas renvoyé après modification.</p>
      <button>Enregistrer mon rappel</button>
    </ActionForm></details>
    {!event.linkedCalendarId && <details><summary>Supprimer l’événement</summary><ActionForm action={deleteEventAction}><input type="hidden" name="id" value={event.id} /><input type="hidden" name="version" value={event.version} />
      <p><label><input type="checkbox" name="confirm" required /> Confirmer la suppression définitive de cet événement et de ses rappels.</label></p><button className="button-danger">Supprimer l’événement</button>
    </ActionForm></details>}</>;
}
