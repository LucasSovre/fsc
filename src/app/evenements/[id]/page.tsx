import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../server/session";
import { getEvent } from "../../../server/calendar";
import { DomainError } from "../../../server/validation";
import { ActionForm } from "../../components/action-form";
import { deleteEventAction } from "../../actions";
import { EventList } from "../../components/event-list";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(), { id } = await params;
  const event = await getEvent(user.id, id).catch(error => { if (error instanceof DomainError && error.status === 404) notFound(); throw error; });
  return <><h1>{event.title}</h1><EventList events={[event]} zone={event.timeZone} />
    <p>{event.visibility === "common" ? "Vous pouvez tous les deux modifier et supprimer cet événement." : "Cet événement est privé. Toi seul peux le consulter et le modifier."}</p>
    {event.location && <p>Lieu : {event.location}</p>}{event.description.split("\n").map((line, i) => <p key={i}>{line}</p>)}
    <p><Link href={`/evenements/${event.id}/modifier`}>Modifier</Link></p>
    <ActionForm action={deleteEventAction}><input type="hidden" name="id" value={event.id} /><input type="hidden" name="version" value={event.version} />
      <p><label><input type="checkbox" name="confirm" required /> Confirmer la suppression définitive de cet événement et de ses rappels.</label></p><button>Supprimer l’événement</button>
    </ActionForm></>;
}
