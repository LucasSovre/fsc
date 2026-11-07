import * as webpush from "web-push";
import { rows, transaction, type Connection } from "./database";
import { reminderPlan } from "./reminder-plan";
import { accessibleCalendar, tokenHash } from "./calendar";
import type { Event, EventReminderChoice, Profile } from "./types";
import { sendMail } from "./mail";
import { baseURL } from "./config";
import { overdueTodos } from "./todo";
import { todoDigestDay, todoDigestText } from "./todo-mail";
import { syncLinkedCalendars } from "./linked-calendars";

type Reminder = { id: string; eventId: string; userId: string; channel: "email" | "push"; dueAt: Date; referenceAt: Date; status: string; attempts: number };
export type Sender = { email: typeof sendMail; push: (subscription: webpush.PushSubscription, payload: string) => Promise<unknown> };
const defaultSender: Sender = {
  email: sendMail,
  push: async (subscription, payload) => {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${process.env.SMTP_FROM_ADDRESS || "admin@example.com"}`, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    return webpush.sendNotification(subscription, payload, { TTL: 300, timeout: 15_000 });
  },
};

function failure(error: unknown) {
  const e = (error || {}) as { statusCode?: number; responseCode?: number; code?: string };
  if (e.statusCode === 404 || e.statusCode === 410) return "expired";
  if (e.statusCode === 429 || (e.statusCode && e.statusCode >= 500) || (e.responseCode && e.responseCode >= 400 && e.responseCode < 500) || e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") return "retry";
  if ((e.statusCode && e.statusCode >= 400) || (e.responseCode && e.responseCode >= 500)) return "failed";
  return "uncertain";
}
async function current(db: Connection, reminder: Reminder) {
  const [event] = await rows<Event>("SELECT * FROM event WHERE id=$1", [reminder.eventId], db);
  const [profile] = await rows<Profile>('SELECT * FROM profile WHERE "userId"=$1', [reminder.userId], db);
  const [user] = await rows<{ email: string; emailVerified: boolean }>('SELECT email,"emailVerified" FROM "user" WHERE id=$1', [reminder.userId], db);
  if (!event || !profile || !user?.emailVerified) return null;
  try { await accessibleCalendar(db, reminder.userId, event.calendarId); } catch { return null; }
  const [preference] = await rows<EventReminderChoice>('SELECT * FROM "eventReminderPreference" WHERE "eventId"=$1 AND "userId"=$2', [event.id, reminder.userId], db);
  const plan = reminderPlan(event, profile, preference);
  const enabled = plan && (reminder.channel === "email" ? plan.emailEnabled : plan.pushEnabled);
  return enabled ? { event, profile, user, plan } : null;
}

export async function recoverInterrupted() {
  // A dispatch whose process died may have reached a provider. Never replay it.
  await transaction(async db => {
    await db.query("UPDATE reminder SET status='uncertain' WHERE status='dispatching'");
    await db.query('UPDATE "todoDigest" SET status=\'uncertain\' WHERE status=\'dispatching\'');
  });
}
type TodoDigestJob = { id: string; userId: string; day: string; attempts: number };
async function todoRecipient(db: Connection, userId: string) {
  const [recipient] = await rows<{ email: string; timeZone: string }>(`SELECT u.email,p."timeZone" FROM profile p JOIN "user" u ON u.id=p."userId"
    WHERE p."userId"=$1 AND p."todoEmailEnabled" AND u."emailVerified"`, [userId], db);
  return recipient;
}
export async function tickTodoDigests(email: Sender["email"] = sendMail, now = new Date()) {
  const users = await rows<{ userId: string }>('SELECT p."userId" FROM profile p JOIN "user" u ON u.id=p."userId" WHERE p."todoEmailEnabled" AND u."emailVerified" ORDER BY p."userId"');
  let count = 0;
  for (const { userId } of users) {
    const job = await transaction(async db => {
      const recipient = await todoRecipient(db, userId);
      const day = recipient && todoDigestDay(now, recipient.timeZone);
      if (!day) return null;
      await db.query('UPDATE "todoDigest" SET status=\'cancelled\' WHERE "userId"=$1 AND day<$2 AND status=\'pending\'', [userId, day]);
      if (!(await overdueTodos(db, userId, day)).length) return null;
      const [claimed] = await rows<TodoDigestJob>(`INSERT INTO "todoDigest"(id,"userId",day,status,attempts,"retryAt")
        VALUES(gen_random_uuid()::text,$1,$2,'dispatching',1,$3)
        ON CONFLICT("userId",day) DO UPDATE SET status='dispatching',attempts="todoDigest".attempts+1
        WHERE "todoDigest".status='pending' AND "todoDigest"."retryAt"<=$3 AND "todoDigest".attempts<4 RETURNING *`, [userId, day, now], db);
      return claimed ?? null;
    });
    if (!job) continue;
    count++;
    await transaction(async db => {
      const [claimed] = await rows('SELECT id FROM "todoDigest" WHERE id=$1 AND status=\'dispatching\'', [job.id], db);
      if (!claimed) return;
      const recipient = await todoRecipient(db, userId);
      const todos = recipient && todoDigestDay(now, recipient.timeZone) === job.day ? await overdueTodos(db, userId, job.day) : [];
      if (!recipient || !todos.length) {
        // No email was attempted; keep today's slot available if work becomes overdue later.
        await db.query('DELETE FROM "todoDigest" WHERE id=$1', [job.id]);
        return;
      }
      let status = "sent";
      try {
        await email(recipient.email, `FSC — ${todos.length} tâche${todos.length > 1 ? "s" : ""} en retard`, todoDigestText(todos, `${baseURL}/todo`));
      } catch (error) {
        const result = failure(error);
        status = result === "retry" && job.attempts < 4 ? "pending" : result === "uncertain" ? "uncertain" : "failed";
      }
      await db.query(`UPDATE "todoDigest" SET status=$2,"sentAt"=CASE WHEN $2='sent' THEN $3::timestamptz ELSE NULL END,"retryAt"=$4 WHERE id=$1`,
        [job.id, status, now, new Date(now.getTime() + Math.min(30 * 2 ** job.attempts, 600) * 1000)]);
    });
  }
  return count;
}
export async function tick(sender: Sender = defaultSender, now = new Date()) {
  // Refresh before dispatch so changed/cancelled source events update their pending reminders first.
  await syncLinkedCalendars(undefined, now);
  let count = 0;
  while (count < 100) {
    const reminder = await transaction(async db => {
      const [job] = await rows<Reminder>(`SELECT * FROM reminder WHERE status='pending' AND "dueAt"<=$1 ORDER BY "dueAt",id FOR UPDATE SKIP LOCKED LIMIT 1`, [now], db);
      if (!job) return null;
      await db.query("UPDATE reminder SET status='dispatching',attempts=attempts+1 WHERE id=$1", [job.id]);
      return job;
    });
    if (!reminder) break;
    count++;
    await transaction(async db => {
      const [claimed] = await rows<Reminder>("SELECT * FROM reminder WHERE id=$1 AND status='dispatching'", [reminder.id], db);
      if (!claimed) return;
      const data = await current(db, reminder);
      // A zero-minute reminder necessarily runs just after its reference time.
      // Allow two polling intervals for normal dispatch, not a late catch-up.
      const expired = data && data.plan.referenceAt.getTime() + (data.plan.reminderMinutes === 0 ? 60_000 : 0) < now.getTime();
      if (!data || expired) {
        await db.query("UPDATE reminder SET status='cancelled' WHERE id=$1", [reminder.id]); return;
      }
      if (data.plan.dueAt > now) {
        await db.query(`UPDATE reminder SET status='pending',"dueAt"=$2,"referenceAt"=$3 WHERE id=$1`, [reminder.id, data.plan.dueAt, data.plan.referenceAt]); return;
      }
      const subscriptions = reminder.channel === "push"
        ? await rows<{ id: string; subscription: webpush.PushSubscription }>('SELECT id,subscription FROM "pushSubscription" WHERE "userId"=$1', [reminder.userId], db) : [];
      const targets = reminder.channel === "email" ? [{ id: tokenHash(data.user.email), subscription: null }] : subscriptions;
      let retry = false, uncertain = false, successful = false;
      for (const target of targets) {
        const [previous] = await rows<{ status: string }>('SELECT status FROM delivery WHERE "reminderId"=$1 AND destination=$2', [reminder.id, target.id], db);
        if (previous && previous.status !== "retry") { successful ||= previous.status === "sent"; uncertain ||= previous.status === "uncertain"; continue; }
        await db.query(`INSERT INTO delivery(id,"reminderId",destination,status) VALUES(gen_random_uuid()::text,$1,$2,'dispatching')
          ON CONFLICT("reminderId",destination) DO UPDATE SET status='dispatching'`, [reminder.id, target.id]);
        let status = "sent";
        try {
          if (reminder.channel === "email") {
            const date = data.event.allDay ? `${data.event.startDate} (journée entière)` : new Intl.DateTimeFormat("fr-FR", { timeZone: data.profile.timeZone, dateStyle: "full", timeStyle: "short" }).format(data.event.startsAt!);
            await sender.email(data.user.email, `FSC — ${data.event.title}`, `${data.event.title}\n${date}\n${data.event.location}\n${data.event.link ? `${data.event.link}\n` : ""}${baseURL}/evenements/${data.event.id}`);
          } else {
            // Fetch the title only after opening FSC. A notification queued on a
            // device must not retain private event data after access is lost.
            await sender.push(target.subscription!, JSON.stringify({ title: "FSC — rappel", body: "Un événement approche. Ouvre FSC pour le consulter.", url: `/evenements/${data.event.id}`, tag: reminder.id }));
          }
          successful = true;
        } catch (error) {
          status = failure(error);
          if (status === "expired") await db.query('DELETE FROM "pushSubscription" WHERE id=$1', [target.id]);
          retry ||= status === "retry"; uncertain ||= status === "uncertain";
        }
        await db.query('UPDATE delivery SET status=$3 WHERE "reminderId"=$1 AND destination=$2', [reminder.id, target.id, status]);
      }
      const next = retry && reminder.attempts < 4 ? "pending" : uncertain ? "uncertain" : successful ? "sent" : "failed";
      await db.query(`UPDATE reminder SET status=$2,"sentAt"=CASE WHEN $2='sent' THEN now() ELSE "sentAt" END,
        "dueAt"=CASE WHEN $2='pending' THEN $3 ELSE "dueAt" END WHERE id=$1`,
      [reminder.id, next, new Date(now.getTime() + Math.min(30 * 2 ** reminder.attempts, 600) * 1000)]);
    });
  }
  count += await tickTodoDigests(sender.email, now);
  await transaction(async db => { await db.query(`INSERT INTO "workerHeartbeat"(id,"updatedAt") VALUES('worker',now()) ON CONFLICT(id) DO UPDATE SET "updatedAt"=now()`); });
  return count;
}
