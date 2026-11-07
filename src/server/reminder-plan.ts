import type { Connection } from "./database";
import { rows } from "./database";
import type { Event, EventReminderChoice, Profile } from "./types";
import { dayInstant } from "./validation";

export function reminderPlan(event: Event, profile: Profile, preference?: EventReminderChoice | null) {
  if (preference?.mode === "off") return null;
  if (preference?.mode !== "custom" && profile.reminderMode === "tags" && !event.tags.some(tag => profile.selectedTags.includes(tag))) return null;
  const effective = preference?.mode === "custom" ? preference : profile;
  const referenceAt = event.allDay ? dayInstant(event.startDate!, profile.timeZone, 9) : event.startsAt!;
  return { referenceAt, dueAt: new Date(referenceAt.getTime() - effective.reminderMinutes * 60_000), reminderMinutes: effective.reminderMinutes, emailEnabled: effective.emailEnabled, pushEnabled: effective.pushEnabled };
}

// All callers hold the same transaction lock as event and membership mutations.
export async function reconcileReminders(db: Connection, eventId?: string, userId?: string) {
  await db.query(`UPDATE reminder SET status='cancelled' WHERE status='pending'
    AND ($1::text IS NULL OR "eventId"=$1) AND ($2::text IS NULL OR "userId"=$2)`, [eventId ?? null, userId ?? null]);
  await db.query(`DELETE FROM "eventReminderPreference" r USING event e, calendar c
    WHERE r."eventId"=e.id AND e."calendarId"=c.id
    AND ($1::text IS NULL OR e.id=$1) AND ($2::text IS NULL OR r."userId"=$2)
    AND NOT(c."ownerId" IS NOT DISTINCT FROM r."userId" OR EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=r."userId"))`, [eventId ?? null, userId ?? null]);
  const pairs = await rows<{ event: Event; profile: Profile; preference: EventReminderChoice | null }>(`
    SELECT row_to_json(e) AS event, row_to_json(p) AS profile, row_to_json(r) AS preference FROM event e
    JOIN calendar c ON c.id=e."calendarId"
    JOIN profile p ON (c.kind='solo' AND c."ownerId"=p."userId") OR
      (c.kind='common' AND EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=p."userId"))
    LEFT JOIN "eventReminderPreference" r ON r."eventId"=e.id AND r."userId"=p."userId"
    WHERE ($1::text IS NULL OR e.id=$1) AND ($2::text IS NULL OR p."userId"=$2)`, [eventId ?? null, userId ?? null], db);
  for (const pair of pairs) {
    const event = { ...pair.event, startsAt: pair.event.startsAt ? new Date(pair.event.startsAt) : null };
    const plan = reminderPlan(event, pair.profile, pair.preference);
    if (!plan || plan.referenceAt.getTime() < Date.now()) continue;
    for (const channel of ["email", "push"] as const) {
      if (!(channel === "email" ? plan.emailEnabled : plan.pushEnabled)) continue;
      await db.query(`INSERT INTO reminder(id,"eventId","userId",channel,"dueAt","referenceAt",status)
        VALUES(gen_random_uuid()::text,$1,$2,$3,$4,$5,'pending')
        ON CONFLICT("eventId","userId",channel) DO UPDATE SET "dueAt"=$4,"referenceAt"=$5,status='pending'
        WHERE reminder.status IN ('pending','cancelled')`, [event.id, pair.profile.userId, channel, plan.dueAt, plan.referenceAt]);
    }
  }
}
