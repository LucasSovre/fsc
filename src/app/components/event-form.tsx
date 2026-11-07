import { Temporal } from "temporal-polyfill";
import type { Event, Tag } from "../../server/types";
import { eventAction } from "../actions";
import { ActionForm } from "./action-form";
import { EventDates } from "./event-fields";
export function EventForm({ event, zone, tags, canCommon, creator, day }: { event?: Event; zone: string; tags: Tag[]; canCommon: boolean; creator: boolean; day?: string }) {
  const tz = event?.timeZone || zone;
  const start = event?.startsAt ? Temporal.Instant.from(event.startsAt.toISOString()).toZonedDateTimeISO(tz).toPlainDateTime()
    : day ? Temporal.PlainDate.from(day).toPlainDateTime("09:00") : Temporal.Now.zonedDateTimeISO(zone).toPlainDateTime().round({ smallestUnit: "hour", roundingMode: "ceil" });
  const end = event?.endsAt ? Temporal.Instant.from(event.endsAt.toISOString()).toZonedDateTimeISO(tz).toPlainDateTime() : start.add({ hours: 1 });
  const startDate = event?.startDate || start.toPlainDate().toString();
  const endDate = event?.endDate || Temporal.PlainDate.from(startDate).add({ days: 1 }).toString();
  return <ActionForm action={eventAction}>
    <fieldset><legend>Qui peut voir cet événement ?</legend>
      <p><label><input type="radio" name="visibility" value="common" required defaultChecked={event?.visibility === "common"} disabled={!canCommon || (!!event && !creator && event.visibility !== "common")} /> Commun — visible et modifiable par vous deux</label></p>
      <p><label><input type="radio" name="visibility" value="solo" required defaultChecked={event?.visibility === "solo"} disabled={!!event && !creator && event.visibility !== "solo"} /> Solo — visible uniquement par toi</label></p>
      {!canCommon && <p>Invite une personne depuis les réglages pour créer des événements communs.</p>}
      {event && creator && <p><label><input type="checkbox" name="confirmVisibility" /> Je confirme un éventuel changement de visibilité. Une personne peut déjà avoir consulté ou exporté cet événement.</label></p>}
    </fieldset>
    {event && <><input type="hidden" name="id" value={event.id} /><input type="hidden" name="version" value={event.version} /></>}
    <p><label>Titre <input name="title" required maxLength={300} defaultValue={event?.title} /></label></p>
    <EventDates initial={{ allDay: event?.allDay ?? false, start: start.toString({ smallestUnit: "minute" }), end: end.toString({ smallestUnit: "minute" }), startDate, endDate, timeZone: tz }} />
    <p><label>Lieu <input name="location" maxLength={500} defaultValue={event?.location} /></label></p>
    <p><label>Description <textarea name="description" maxLength={10000} defaultValue={event?.description} rows={5} /></label></p>
    <fieldset><legend>Tags (facultatifs)</legend>
      {tags.map(tag => <p key={tag.key}><label><input type="checkbox" name="tags" value={tag.key} defaultChecked={event?.tags.includes(tag.key)} /> {tag.label}</label></p>)}
      <p><label>Nouveaux tags, séparés par des virgules <input name="newTags" maxLength={1800} /></label></p>
      <p>Les noms de tags sont partagés dans le couple. Les événements solo associés restent privés.</p>
    </fieldset><button type="submit">{event ? "Enregistrer les modifications" : "Créer l’événement"}</button>
  </ActionForm>;
}
