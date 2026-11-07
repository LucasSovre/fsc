import { createHash, randomBytes, randomUUID } from "node:crypto";
import { rows, transaction, type Connection } from "./database";
import type { Calendar, Event, Profile, Tag } from "./types";
import { DomainError, dateValue, eventDates, eventSchema, localDate, preferencesSchema, tagKey, tagLabel, zoneSchema } from "./validation";
import { reconcileReminders } from "./reminder-plan";
import { baseURL } from "./config";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
export async function account(db: Connection, userId: string, initialZone?: string) {
  const [user] = await rows<{ id: string; email: string; emailVerified: boolean }>('SELECT id,email,"emailVerified" FROM "user" WHERE id=$1', [userId], db);
  if (!user?.emailVerified) throw new DomainError("Connecte-toi avec une adresse e-mail vérifiée.", 401);
  let [profile] = await rows<Profile>('SELECT * FROM profile WHERE "userId"=$1', [userId], db);
  if (!profile) {
    const catalogId = randomUUID(), calendarId = randomUUID();
    await db.query("INSERT INTO catalog(id) VALUES($1)", [catalogId]);
    await db.query('INSERT INTO calendar(id,kind,"ownerId","catalogId") VALUES($1,\'solo\',$2,$3)', [calendarId, userId, catalogId]);
    const zone = zoneSchema.safeParse(initialZone);
    [profile] = await rows<Profile>('INSERT INTO profile("userId","calendarId","catalogId","timeZone") VALUES($1,$2,$3,$4) RETURNING *', [userId, calendarId, catalogId, zone.success ? zone.data : "Europe/Paris"], db);
  }
  return { user, profile };
}
export async function initializeAccount(userId: string, zone?: string) { await transaction(db => account(db, userId, zone)); }
export async function accessibleCalendar(db: Connection, userId: string, calendarId: string) {
  const [calendar] = await rows<Calendar>(`SELECT * FROM calendar c WHERE c.id=$2 AND
    (c."ownerId"=$1 OR EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=$1))`, [userId, calendarId], db);
  if (!calendar) throw new DomainError("Calendrier introuvable.", 404);
  return calendar;
}
async function calendarsIn(db: Connection, userId: string) {
  return rows<Calendar>(`SELECT * FROM calendar c WHERE c."ownerId"=$1 OR
    EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=$1) ORDER BY c.kind DESC`, [userId], db);
}
export async function settings(userId: string) {
  return transaction(async db => {
    const { user, profile } = await account(db, userId);
    const calendars = await calendarsIn(db, userId);
    const tags = await rows<Tag>('SELECT key,label FROM tag WHERE "catalogId"=$1 ORDER BY label', [profile.catalogId], db);
    const invitations = await rows<{ id: string; email: string; expiresAt: Date }>(`SELECT i.id,i.email,i."expiresAt" FROM invitation i
      JOIN member m ON m."calendarId"=i."calendarId" AND m."userId"=$1
      WHERE i."usedAt" IS NULL AND i."revokedAt" IS NULL AND i."expiresAt">now() ORDER BY i."createdAt"`, [userId], db);
    const members = await rows<{ name: string; email: string }>(`SELECT u.name,u.email FROM "user" u JOIN member m ON m."userId"=u.id
      WHERE m."calendarId" IN(SELECT "calendarId" FROM member WHERE "userId"=$1)`, [userId], db);
    return { user, profile, calendars, tags, invitations, members };
  });
}
export async function listCalendars(userId: string) {
  return transaction(async db => { await account(db, userId); return calendarsIn(db, userId); });
}
export async function getEvent(userId: string, eventId: string) {
  return transaction(async db => { await account(db, userId); return eventIn(db, userId, eventId); });
}
async function eventIn(db: Connection, userId: string, eventId: string) {
  const [event] = await rows<Event>(`SELECT e.*,c.kind AS visibility FROM event e JOIN calendar c ON c.id=e."calendarId"
    WHERE e.id=$2 AND(c."ownerId"=$1 OR EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=$1))`, [userId, eventId], db);
  if (!event) throw new DomainError("Événement introuvable.", 404);
  return event;
}
export type EventRange = { calendarId?: string; from: Date; to: Date; cursor?: string; limit?: number };
export async function listEvents(userId: string, range: EventRange) {
  if (!Number.isFinite(range.from.getTime()) || !Number.isFinite(range.to.getTime()) || range.to <= range.from)
    throw new DomainError("Plage de dates invalide.");
  if (range.to.getTime() - range.from.getTime() > 366 * 86400_000) throw new DomainError("La plage maximale est de 366 jours.");
  const offset = range.cursor ? Number(range.cursor) : 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new DomainError("Page invalide.");
  const limit = Math.max(1, Math.min(range.limit ?? 50, 500));
  return transaction(async db => {
    const { profile } = await account(db, userId);
    if (range.calendarId) await accessibleCalendar(db, userId, range.calendarId);
    // Local dates are half-open as well; preserve a partial final day.
    const fromDate = localDate(range.from, profile.timeZone);
    const lastDate = localDate(new Date(range.to.getTime() - 1), profile.timeZone);
    const events = await rows<Event>(`SELECT e.*,c.kind AS visibility FROM event e JOIN calendar c ON c.id=e."calendarId"
      WHERE(c."ownerId"=$1 OR EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=$1))
      AND($2::text IS NULL OR c.id=$2)
      AND((NOT e."allDay" AND e."startsAt"<$4 AND e."endsAt">$3)
        OR(e."allDay" AND e."startDate"<=$6 AND e."endDate">$5))
      ORDER BY CASE WHEN e."allDay" THEN e."startDate"::timestamp AT TIME ZONE $7 ELSE e."startsAt" END,e.id LIMIT $8 OFFSET $9`,
    [userId, range.calendarId ?? null, range.from, range.to, fromDate, lastDate, profile.timeZone, limit + 1, offset], db);
    return { events: events.slice(0, limit), nextCursor: events.length > limit ? String(offset + limit) : null };
  });
}
export async function saveEvent(userId: string, raw: unknown, edit?: { id: string; version: number; confirmVisibility?: boolean }) {
  const input = eventSchema.parse(raw);
  return transaction(async db => {
    const { profile } = await account(db, userId);
    const existing = edit ? await eventIn(db, userId, edit.id) : undefined;
    if (existing && existing.version !== edit!.version) throw new DomainError("Cet événement a changé. Recharge la page avant de modifier.", 409);
    const calendars = await calendarsIn(db, userId);
    let target = calendars.find(c => c.kind === input.visibility);
    // A partner editing a common event never moves it into their own calendar.
    if (existing && existing.visibility === input.visibility) target = calendars.find(c => c.id === existing.calendarId);
    if (!target || (input.calendarId && input.calendarId !== target.id)) throw new DomainError("Le calendrier ne correspond pas à la visibilité choisie.");
    if (existing && existing.visibility !== input.visibility) {
      if (existing.creatorId !== userId) throw new DomainError("Seul le créateur peut changer la visibilité.", 403);
      if (!edit?.confirmVisibility) throw new DomainError("Confirme le changement de visibilité.");
    }
    const dates = eventDates(input.temporalData, profile.timeZone);
    const tags = [...new Set(input.tags.map(tagKey))];
    await addTags(db, profile.catalogId, input.tags);
    const values = [target.id, input.title, input.description, input.location, dates.allDay, dates.startsAt, dates.endsAt,
      dates.startDate, dates.endDate, dates.timeZone, tags];
    let id: string;
    if (existing) {
      id = existing.id;
      await db.query(`UPDATE event SET "calendarId"=$1,title=$2,description=$3,location=$4,"allDay"=$5,"startsAt"=$6,"endsAt"=$7,
        "startDate"=$8,"endDate"=$9,"timeZone"=$10,tags=$11,version=version+1,"updatedAt"=now() WHERE id=$12`, [...values, id]);
    } else {
      id = randomUUID();
      await db.query(`INSERT INTO event("calendarId",title,description,location,"allDay","startsAt","endsAt","startDate","endDate","timeZone",tags,id,"creatorId")
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [...values, id, userId]);
    }
    await reconcileReminders(db, id);
    return eventIn(db, userId, id);
  });
}
export async function deleteEvent(userId: string, eventId: string, version: number) {
  return transaction(async db => {
    await account(db, userId);
    const event = await eventIn(db, userId, eventId);
    if (event.version !== version) throw new DomainError("Cet événement a changé. Recharge la page.", 409);
    await db.query("DELETE FROM event WHERE id=$1", [eventId]);
  });
}
async function addTags(db: Connection, catalogId: string, labels: string[]) {
  for (const label of labels) await db.query(`INSERT INTO tag(id,"catalogId",key,label) VALUES($1,$2,$3,$4)
    ON CONFLICT("catalogId",key) DO NOTHING`, [randomUUID(), catalogId, tagKey(label), tagLabel(label)]);
}
export async function savePreferences(userId: string, raw: unknown) {
  const input = preferencesSchema.parse(raw);
  if (input.emailEnabled && !process.env.SMTP_HOST) throw new DomainError("Le service e-mail n’est pas configuré.");
  if (input.pushEnabled && (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)) throw new DomainError("Les notifications web ne sont pas configurées.");
  return transaction(async db => {
    const { profile } = await account(db, userId);
    const catalog = await rows<Tag>('SELECT key,label FROM tag WHERE "catalogId"=$1', [profile.catalogId], db);
    const selectedTags = [...new Set(input.selectedTags.map(tagKey))];
    if (selectedTags.some(key => !catalog.some(t => t.key === key))) throw new DomainError("Tag inconnu.");
    if (input.pushEnabled && !(await rows('SELECT id FROM "pushSubscription" WHERE "userId"=$1', [userId], db)).length)
      throw new DomainError("Active d’abord les notifications sur cet appareil.");
    await db.query(`UPDATE profile SET "timeZone"=$2,"reminderMinutes"=$3,"emailEnabled"=$4,"pushEnabled"=$5,"reminderMode"=$6,"selectedTags"=$7 WHERE "userId"=$1`,
      [userId, input.timeZone, input.reminderMinutes, input.emailEnabled, input.pushEnabled, input.reminderMode, selectedTags]);
    await reconcileReminders(db, undefined, userId);
  });
}
export async function createInvitation(userId: string, emailValue: string) {
  const email = emailValue.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new DomainError("Adresse e-mail invalide.");
  return transaction(async db => {
    const { user, profile } = await account(db, userId);
    if (email === user.email.toLowerCase()) throw new DomainError("Invite une autre personne.");
    let common = (await calendarsIn(db, userId)).find(c => c.kind === "common");
    if (!common) {
      const id = randomUUID();
      [common] = await rows<Calendar>('INSERT INTO calendar(id,kind,"catalogId") VALUES($1,\'common\',$2) RETURNING *', [id, profile.catalogId], db);
      await db.query('INSERT INTO member("userId","calendarId") VALUES($1,$2)', [userId, id]);
    }
    const members = await rows('SELECT "userId" FROM member WHERE "calendarId"=$1', [common.id], db);
    if (members.length >= 2) throw new DomainError("Ce calendrier compte déjà deux personnes.");
    await db.query('UPDATE invitation SET "revokedAt"=now() WHERE "calendarId"=$1 AND "usedAt" IS NULL AND "revokedAt" IS NULL', [common.id]);
    const token = secret(), id = randomUUID();
    await db.query(`INSERT INTO invitation(id,"tokenHash","calendarId","inviterId",email,"expiresAt") VALUES($1,$2,$3,$4,$5,now()+interval '7 days')`,
      [id, tokenHash(token), common.id, userId, email]);
    return { id, email, url: `${baseURL}/invitation/${token}` };
  });
}
export async function acceptInvitation(userId: string, token: string) {
  return transaction(async db => {
    const { user, profile } = await account(db, userId);
    const [invite] = await rows<{ id: string; email: string; calendarId: string }>(`SELECT * FROM invitation WHERE "tokenHash"=$1 AND "usedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt">now()`, [tokenHash(token)], db);
    if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase()) throw new DomainError("Invitation invalide, expirée ou destinée à une autre adresse.");
    if ((await rows('SELECT "userId" FROM member WHERE "userId"=$1', [userId], db)).length) throw new DomainError("Quitte ton calendrier commun actuel avant d’accepter.");
    const members = await rows('SELECT "userId" FROM member WHERE "calendarId"=$1', [invite.calendarId], db);
    if (members.length !== 1) throw new DomainError("Ce calendrier n’est plus disponible.");
    const [common] = await rows<Calendar>('SELECT * FROM calendar WHERE id=$1', [invite.calendarId], db);
    await db.query(`INSERT INTO tag(id,"catalogId",key,label) SELECT gen_random_uuid()::text,$1,key,label FROM tag WHERE "catalogId"=$2 ON CONFLICT("catalogId",key) DO NOTHING`, [common.catalogId, profile.catalogId]);
    await db.query('UPDATE profile SET "catalogId"=$2 WHERE "userId"=$1', [userId, common.catalogId]);
    await db.query('INSERT INTO member("userId","calendarId") VALUES($1,$2)', [userId, common.id]);
    await db.query('UPDATE invitation SET "usedAt"=now() WHERE id=$1', [invite.id]);
    await reconcileReminders(db, undefined, userId);
  });
}
export async function revokeInvitation(userId: string, id: string) {
  return transaction(async db => {
    await account(db, userId);
    await db.query(`UPDATE invitation SET "revokedAt"=now() WHERE id=$2 AND "calendarId" IN(SELECT "calendarId" FROM member WHERE "userId"=$1)`, [userId, id]);
  });
}
export async function leaveCalendar(userId: string) {
  return transaction(async db => {
    const { profile } = await account(db, userId);
    const [member] = await rows<{ calendarId: string }>('DELETE FROM member WHERE "userId"=$1 RETURNING "calendarId"', [userId], db);
    if (!member) throw new DomainError("Aucun calendrier commun.");
    const catalogId = randomUUID();
    await db.query("INSERT INTO catalog(id) VALUES($1)", [catalogId]);
    await db.query(`INSERT INTO tag(id,"catalogId",key,label) SELECT gen_random_uuid()::text,$1,key,label FROM tag WHERE "catalogId"=$2`, [catalogId, profile.catalogId]);
    await db.query('UPDATE profile SET "catalogId"=$2 WHERE "userId"=$1', [userId, catalogId]);
    await db.query('DELETE FROM feed WHERE "userId"=$1 AND "calendarId"=$2', [userId, member.calendarId]);
    await db.query('UPDATE invitation SET "revokedAt"=now() WHERE "calendarId"=$1 AND "usedAt" IS NULL', [member.calendarId]);
    await reconcileReminders(db, undefined, userId);
  });
}
export async function rotateFeed(userId: string, calendarId: string) {
  return transaction(async db => {
    await account(db, userId); await accessibleCalendar(db, userId, calendarId);
    const token = secret();
    await db.query(`INSERT INTO feed(id,"userId","calendarId","tokenHash") VALUES($1,$2,$3,$4)
      ON CONFLICT("userId","calendarId") DO UPDATE SET "tokenHash"=$4,"createdAt"=now()`, [randomUUID(), userId, calendarId, tokenHash(token)]);
    return `${baseURL}/abonnements/${token}.ics`;
  });
}
export async function revokeFeed(userId: string, calendarId: string) {
  return transaction(async db => { await account(db, userId); await db.query('DELETE FROM feed WHERE "userId"=$1 AND "calendarId"=$2', [userId, calendarId]); });
}
export async function feedEvents(userId: string, calendarId: string, token?: string) {
  return transaction(async db => {
    await account(db, userId);
    if (token && !(await rows('SELECT id FROM feed WHERE "userId"=$1 AND "calendarId"=$2 AND "tokenHash"=$3', [userId, calendarId, tokenHash(token)], db)).length)
      throw new DomainError("Abonnement introuvable.", 404);
    const calendar = await accessibleCalendar(db, userId, calendarId);
    const events = await rows<Event>('SELECT e.*, $2::text AS visibility FROM event e WHERE "calendarId"=$1 ORDER BY "createdAt",id', [calendar.id, calendar.kind], db);
    return { calendar, events };
  });
}
export { dateValue };
