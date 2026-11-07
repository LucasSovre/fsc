import { Temporal } from "temporal-polyfill";
import type { Event, EventAttachment, EventReminderChoice, Profile, Tag } from "../../server/types";
import { eventAction } from "../actions";
import { ActionForm } from "./action-form";
import { EventDates } from "./event-fields";
import { EventReminderFields } from "./event-reminder-fields";
import { EventTypeFields } from "./event-type-fields";
export function EventForm({ event, attachments = [], zone, tags, canCommon, creator, day, reminder, reminderDefaults }: { event?: Event; attachments?: EventAttachment[]; zone: string; tags: Tag[]; canCommon: boolean; creator: boolean; day?: string; reminder?: EventReminderChoice; reminderDefaults: Pick<Profile, "reminderMinutes" | "emailEnabled" | "pushEnabled"> }) {
  const tz = event?.timeZone || zone;
  const start = event?.startsAt ? Temporal.Instant.from(event.startsAt.toISOString()).toZonedDateTimeISO(tz).toPlainDateTime()
    : day ? Temporal.PlainDate.from(day).toPlainDateTime("09:00") : Temporal.Now.zonedDateTimeISO(zone).toPlainDateTime().round({ smallestUnit: "hour", roundingMode: "ceil" });
  const end = event?.endsAt ? Temporal.Instant.from(event.endsAt.toISOString()).toZonedDateTimeISO(tz).toPlainDateTime() : start.add({ hours: 1 });
  const startDate = event?.startDate || start.toPlainDate().toString();
  const endDate = event?.endDate || Temporal.PlainDate.from(startDate).add({ days: 1 }).toString();
  return <ActionForm action={eventAction}>
    <fieldset className="visibility-field"><legend>Qui peut voir cet événement ?</legend>
      <div className="visibility-options">
        <label className="visibility-option visibility-solo"><input type="radio" name="visibility" value="solo" required defaultChecked={event?.visibility === "solo"} disabled={!!event && !creator && event.visibility !== "solo"} /><span>Solo<span className="sr-only"> — visible uniquement par toi</span></span><svg className="visibility-check" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="m6 10 3 3 5-6" /></svg></label>
        <label className="visibility-option visibility-common"><input type="radio" name="visibility" value="common" required defaultChecked={event?.visibility === "common"} disabled={!canCommon || (!!event && !creator && event.visibility !== "common")} /><span>Commun<span className="sr-only"> — visible et modifiable par vous deux</span></span><svg className="visibility-check" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="m6 10 3 3 5-6" /></svg></label>
      </div>
      {!canCommon && <p>Invite une personne depuis les réglages pour créer des événements communs.</p>}
      {event && creator && <p><label><input type="checkbox" name="confirmVisibility" /> Je confirme un éventuel changement de visibilité. Une personne peut déjà avoir consulté ou exporté cet événement.</label></p>}
    </fieldset>
    {event && <><input type="hidden" name="id" value={event.id} /><input type="hidden" name="version" value={event.version} /></>}
    <p><label>Titre <input name="title" required maxLength={300} defaultValue={event?.title} /></label></p>
    <EventTypeFields eventId={event?.id} initialType={event?.type ?? null} link={event?.link ?? ""} attachments={attachments} />
    <EventDates initial={{ allDay: event?.allDay ?? false, start: start.toString({ smallestUnit: "minute" }), end: end.toString({ smallestUnit: "minute" }), startDate, endDate, timeZone: tz }} />
    <p><label>Lieu <input name="location" maxLength={500} defaultValue={event?.location} /></label></p>
    <p><label>Description <textarea name="description" maxLength={10000} defaultValue={event?.description} rows={5} /></label></p>
    <fieldset><legend>Tags (facultatifs)</legend>
      {tags.map(tag => <p key={tag.key}><label><input type="checkbox" name="tags" value={tag.key} defaultChecked={event?.tags.includes(tag.key)} /> {tag.label}</label></p>)}
      <p><label>Nouveaux tags, séparés par des virgules <input name="newTags" maxLength={1800} /></label></p>
      <p>Les noms de tags sont partagés dans le couple. Les événements solo associés restent privés.</p>
    </fieldset>
    <EventReminderFields initial={reminder} defaults={reminderDefaults} />
    <button type="submit">{event ? "Enregistrer les modifications" : "Créer l’événement"}</button>
  </ActionForm>;
}
