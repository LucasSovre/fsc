import type { Connection } from "./database";
import { rows } from "./database";
import type { Event, Profile } from "./types";
import { dayInstant } from "./validation";

export function reminderPlan(event: Event, profile: Profile) {
  if (profile.reminderMode === "tags" && !event.tags.some(tag => profile.selectedTags.includes(tag))) return null;
  const referenceAt = event.allDay ? dayInstant(event.startDate!, profile.timeZone, 9) : event.startsAt!;
  return { referenceAt, dueAt: new Date(referenceAt.getTime() - profile.reminderMinutes * 60_000) };
}

// All callers hold the same transaction lock as event and membership mutations.
export async function reconcileReminders(db: Connection, eventId?: string, userId?: string) {
  await db.query(`UPDATE reminder SET status='cancelled' WHERE status='pending'
    AND ($1::text IS NULL OR "eventId"=$1) AND ($2::text IS NULL OR "userId"=$2)`, [eventId ?? null, userId ?? null]);
  const pairs = await rows<{ event: Event; profile: Profile }>(`
    SELECT row_to_json(e) AS event, row_to_json(p) AS profile FROM event e
    JOIN calendar c ON c.id=e."calendarId"
    JOIN profile p ON (c.kind='solo' AND c."ownerId"=p."userId") OR
      (c.kind='common' AND EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=p."userId"))
    WHERE ($1::text IS NULL OR e.id=$1) AND ($2::text IS NULL OR p."userId"=$2)`, [eventId ?? null, userId ?? null], db);
  for (const pair of pairs) {
    const event = { ...pair.event, startsAt: pair.event.startsAt ? new Date(pair.event.startsAt) : null };
    const plan = reminderPlan(event, pair.profile);
    if (!plan || plan.referenceAt.getTime() < Date.now()) continue;
    for (const channel of ["email", "push"] as const) {
      if (!(channel === "email" ? pair.profile.emailEnabled : pair.profile.pushEnabled)) continue;
      await db.query(`INSERT INTO reminder(id,"eventId","userId",channel,"dueAt","referenceAt",status)
        VALUES(gen_random_uuid()::text,$1,$2,$3,$4,$5,'pending')
        ON CONFLICT("eventId","userId",channel) DO UPDATE SET "dueAt"=$4,"referenceAt"=$5,status='pending'
        WHERE reminder.status IN ('pending','cancelled')`, [event.id, pair.profile.userId, channel, plan.dueAt, plan.referenceAt]);
    }
  }
}
