import { createHash, randomUUID } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { account, accessibleCalendar } from "./calendar";
import { rows, transaction, type Connection } from "./database";
import { calendarSourceURL, decryptCalendarURL, encryptCalendarURL, fetchCalendarSource } from "./calendar-source";
import { parseCalendarSource, type SourceEvent } from "./calendar-parser";
import { reconcileReminders } from "./reminder-plan";
import { DomainError, eventDates, localDate, tagKey, tagLabel } from "./validation";
import type { Calendar } from "./types";

export const CALENDAR_SYNC_INTERVAL = 15 * 60_000;
type Source = { id: string; userId: string; calendarId: string; name: string; encryptedUrl: string; enabled: boolean; syncToken: string | null; nextSyncAt: Date; lastSyncedAt: Date | null; lastError: string | null };
export type LinkedCalendarSummary = Pick<Source, "id" | "userId" | "name" | "enabled" | "lastSyncedAt" | "lastError"> & { visibility: "solo" | "common"; eventCount: number };
export type CalendarFetcher = (url: string) => Promise<string>;

export async function listLinkedCalendars(userId: string) {
  return transaction(async db => {
    await account(db, userId);
    return rows<LinkedCalendarSummary>(`SELECT s.id,s."userId",s.name,s.enabled,s."lastSyncedAt",s."lastError",c.kind AS visibility,
      (SELECT count(*)::int FROM event e WHERE e."linkedCalendarId"=s.id) AS "eventCount"
      FROM "linkedCalendar" s JOIN calendar c ON c.id=s."calendarId"
      WHERE s."userId"=$1 OR c."ownerId"=$1 OR EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=$1) ORDER BY s.name,s.id`, [userId], db);
  });
}
export async function addLinkedCalendar(userId: string, raw: unknown): Promise<string> {
  const input = z.object({ name: z.string().trim().min(1, "Nomme ce calendrier.").max(100), url: z.string().min(1).max(4096), visibility: z.enum(["solo", "common"], { error: "Choisis Solo ou Commun." }) }).parse(raw);
  const url = calendarSourceURL(input.url).toString(), encryptedUrl = encryptCalendarURL(url);
  return transaction(async db => {
    const { profile } = await account(db, userId);
    const calendarId = input.visibility === "solo" ? profile.calendarId : (await rows<{ calendarId: string }>('SELECT "calendarId" FROM member WHERE "userId"=$1', [userId], db))[0]?.calendarId;
    if (!calendarId) throw new DomainError("Crée d’abord un calendrier commun depuis les réglages.");
    await accessibleCalendar(db, userId, calendarId);
    const urlHash = createHash("sha256").update(url).digest("hex");
    const id = randomUUID();
    const inserted = await rows(`INSERT INTO "linkedCalendar"(id,"userId","calendarId",name,"encryptedUrl","urlHash") VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT("calendarId","urlHash") DO NOTHING RETURNING id`, [id, userId, calendarId, input.name, encryptedUrl, urlHash], db);
    if (!inserted.length) throw new DomainError("Ce calendrier est déjà lié à cet agenda.");
    return id;
  });
}
async function ownSource(db: Connection, userId: string, id: string) {
  await account(db, userId);
  const [source] = await rows<Source>('SELECT * FROM "linkedCalendar" WHERE id=$1 AND "userId"=$2', [id, userId], db);
  if (!source) throw new DomainError("Calendrier lié introuvable ou géré par une autre personne.", 404);
  return source;
}
export async function setLinkedCalendarEnabled(userId: string, id: string, enabled: boolean) {
  return transaction(async db => {
    const source = await ownSource(db, userId, id);
    if (enabled) await accessibleCalendar(db, userId, source.calendarId);
    await db.query('UPDATE "linkedCalendar" SET enabled=$2,"syncToken"=NULL,"nextSyncAt"=now() WHERE id=$1', [id, enabled]);
  });
}
export async function removeLinkedCalendar(userId: string, id: string) {
  return transaction(async db => { await ownSource(db, userId, id); await db.query('DELETE FROM "linkedCalendar" WHERE id=$1', [id]); });
}
async function applyEvents(db: Connection, source: Source, calendar: Calendar, timeZone: string, events: SourceEvent[]) {
  const changed: string[] = [];
  for (const { key, input } of events) {
    const dates = eventDates(input.temporalData, timeZone), tags = [...new Set((input.tags ?? []).map(tagKey))];
    for (const label of input.tags ?? []) await db.query(`INSERT INTO tag(id,"catalogId",key,label) VALUES($1,$2,$3,$4) ON CONFLICT("catalogId",key) DO NOTHING`, [randomUUID(), calendar.catalogId, tagKey(label), tagLabel(label)]);
    const [event] = await rows<{ id: string }>(`INSERT INTO event(id,"calendarId","creatorId",title,description,location,"allDay","startsAt","endsAt","startDate","endDate","timeZone",tags,"linkedCalendarId","sourceKey")
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT("linkedCalendarId","sourceKey") DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,location=EXCLUDED.location,
        "allDay"=EXCLUDED."allDay","startsAt"=EXCLUDED."startsAt","endsAt"=EXCLUDED."endsAt","startDate"=EXCLUDED."startDate","endDate"=EXCLUDED."endDate",
        "timeZone"=EXCLUDED."timeZone",tags=EXCLUDED.tags,version=event.version+1,"updatedAt"=now()
      WHERE (event.title,event.description,event.location,event."allDay",event."startsAt",event."endsAt",event."startDate",event."endDate",event."timeZone",event.tags)
        IS DISTINCT FROM (EXCLUDED.title,EXCLUDED.description,EXCLUDED.location,EXCLUDED."allDay",EXCLUDED."startsAt",EXCLUDED."endsAt",EXCLUDED."startDate",EXCLUDED."endDate",EXCLUDED."timeZone",EXCLUDED.tags)
      RETURNING id`, [randomUUID(), calendar.id, source.userId, input.title, input.description ?? "", input.location ?? "", dates.allDay, dates.startsAt, dates.endsAt, dates.startDate, dates.endDate, dates.timeZone, tags, source.id, key], db);
    if (event) changed.push(event.id);
  }
  await db.query('DELETE FROM event WHERE "linkedCalendarId"=$1 AND NOT("sourceKey"=ANY($2::text[]))', [source.id, events.map(event => event.key)]);
  for (const id of changed) await reconcileReminders(db, id);
}
export async function syncLinkedCalendar(id: string, fetcher: CalendarFetcher = fetchCalendarSource, now = new Date(), requestedBy?: string) {
  const claimed = await transaction(async db => {
    const source = requestedBy ? await ownSource(db, requestedBy, id) : (await rows<Source>('SELECT * FROM "linkedCalendar" WHERE id=$1', [id], db))[0];
    if (!source || !source.enabled || (!requestedBy && source.nextSyncAt > now)) return null;
    try { await account(db, source.userId); await accessibleCalendar(db, source.userId, source.calendarId); }
    catch { await db.query('UPDATE "linkedCalendar" SET enabled=false,"syncToken"=NULL,"lastError"=$2 WHERE id=$1', [id, "Synchronisation arrêtée : le propriétaire n’a plus accès à cet agenda."]); return null; }
    const token = randomUUID();
    await db.query('UPDATE "linkedCalendar" SET "syncToken"=$2,"nextSyncAt"=$3 WHERE id=$1', [id, token, new Date(now.getTime() + CALENDAR_SYNC_INTERVAL)]);
    const { profile } = await account(db, source.userId);
    return { source, token, timeZone: profile.timeZone };
  });
  if (!claimed) return false;
  try {
    const today = Temporal.PlainDate.from(localDate(now, claimed.timeZone));
    const data = await fetcher(decryptCalendarURL(claimed.source.encryptedUrl));
    const events = parseCalendarSource(data, { timeZone: claimed.timeZone, from: today.subtract({ years: 1 }).toString(), to: today.add({ years: 2 }).toString() });
    return await transaction(async db => {
      const [source] = await rows<Source>('SELECT * FROM "linkedCalendar" WHERE id=$1 AND enabled AND "syncToken"=$2', [id, claimed.token], db);
      if (!source) return false;
      await account(db, source.userId);
      const calendar = await accessibleCalendar(db, source.userId, source.calendarId);
      await applyEvents(db, source, calendar, claimed.timeZone, events);
      await db.query('UPDATE "linkedCalendar" SET "lastSyncedAt"=$2,"lastError"=NULL,"syncToken"=NULL WHERE id=$1', [id, now]);
      return true;
    });
  } catch (error) {
    const message = error instanceof DomainError ? error.message : "La synchronisation a échoué. Les événements précédents sont conservés.";
    await transaction(async db => { await db.query('UPDATE "linkedCalendar" SET "lastError"=$3,"syncToken"=NULL WHERE id=$1 AND "syncToken"=$2', [id, claimed.token, message]); });
    throw new DomainError(message);
  }
}
export async function syncLinkedCalendars(fetcher: CalendarFetcher = fetchCalendarSource, now = new Date()) {
  const sources = await rows<{ id: string }>('SELECT id FROM "linkedCalendar" WHERE enabled AND "nextSyncAt"<=$1 ORDER BY "nextSyncAt",id LIMIT 3', [now]);
  await Promise.all(sources.map(async source => {
    try { await syncLinkedCalendar(source.id, fetcher, now); } catch { /* Error recorded per source; retry at its next scheduled refresh. */ }
  }));
  return sources.length;
}
