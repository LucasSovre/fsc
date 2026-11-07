import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { account, eventIn } from "./calendar";
import { rows, transaction } from "./database";
import type { EventAttachment } from "./types";
import { DomainError } from "./validation";

export const maxAttachments = 10;
export const maxAttachmentBytes = 10 * 1024 * 1024;
const allowedMimes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const uploadDir = () => process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");
const eventDir = (eventId: string) => join(uploadDir(), eventId);
const cleanName = (name: string) => name.normalize("NFC").replace(/[\\/\u0000-\u001f"]/g, "_").trim().slice(0, 200) || "billet";

export const listAttachments = (eventId: string) =>
  rows<EventAttachment>('SELECT id,"eventId",name,mime,size FROM "eventAttachment" WHERE "eventId"=$1 ORDER BY "createdAt",id', [eventId]);

export async function syncAttachments(userId: string, eventId: string, files: File[], removeIds: string[]) {
  const incoming = files.filter(file => file.size > 0);
  if (!incoming.length && !removeIds.length) return;
  for (const file of incoming) {
    if (!allowedMimes.includes(file.type)) throw new DomainError(`Format non accepté pour « ${cleanName(file.name)} » : PDF, PNG, JPEG ou WebP uniquement.`);
    if (file.size > maxAttachmentBytes) throw new DomainError(`« ${cleanName(file.name)} » dépasse 10 Mo.`);
  }
  const removed: string[] = [];
  await transaction(async db => {
    await account(db, userId);
    const event = await eventIn(db, userId, eventId);
    if (event.linkedCalendarId) throw new DomainError("Les événements importés n’acceptent pas de billets.");
    for (const id of removeIds) {
      const result = await db.query('DELETE FROM "eventAttachment" WHERE id=$1 AND "eventId"=$2', [id, eventId]);
      if (result.rowCount) removed.push(id);
    }
    const [{ count }] = (await db.query<{ count: number }>('SELECT count(*)::int AS count FROM "eventAttachment" WHERE "eventId"=$1', [eventId])).rows;
    if (count + incoming.length > maxAttachments) throw new DomainError(`Un événement accepte ${maxAttachments} billets au maximum.`);
    await mkdir(eventDir(eventId), { recursive: true });
    for (const file of incoming) {
      const id = randomUUID();
      await db.query('INSERT INTO "eventAttachment"(id,"eventId",name,mime,size,"createdAt") VALUES($1,$2,$3,$4,$5,clock_timestamp())', [id, eventId, cleanName(file.name), file.type, file.size]);
      await writeFile(join(eventDir(eventId), id), Buffer.from(await file.arrayBuffer()));
    }
  });
  await Promise.all(removed.map(id => rm(join(eventDir(eventId), id), { force: true })));
}

export async function readAttachment(userId: string, eventId: string, attachmentId: string) {
  const attachment = await transaction(async db => {
    await account(db, userId);
    await eventIn(db, userId, eventId);
    const [found] = await rows<EventAttachment>('SELECT id,"eventId",name,mime,size FROM "eventAttachment" WHERE id=$1 AND "eventId"=$2', [attachmentId, eventId], db);
    if (!found) throw new DomainError("Billet introuvable.", 404);
    return found;
  });
  const data = await readFile(join(eventDir(eventId), attachment.id)).catch(() => { throw new DomainError("Billet introuvable.", 404); });
  return { attachment, data };
}

export const removeEventFiles = (eventId: string) => rm(eventDir(eventId), { recursive: true, force: true });
