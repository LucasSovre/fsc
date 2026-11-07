import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { isAdmin } from "./admin";
import { scopes as oauthScopes } from "./config";
import { rows } from "./database";
import { DomainError, idSchema } from "./validation";

export const apiKeyScopes = oauthScopes.filter(scope => scope !== "offline_access");
const maxKeys = 20;
const hash = (key: string) => createHash("sha256").update(key).digest("hex");
export const looksLikeApiKey = (value: string) => /^fsc_[A-Za-z0-9_-]{43}$/.test(value);

export async function createApiKey(userId: string, input: { name: string; scopes: string[] }) {
  const name = z.string().trim().min(1, "Le nom est obligatoire.").max(100).parse(input.name);
  const scopes = z.array(z.enum(apiKeyScopes, { error: "Autorisation inconnue." })).min(1, "Choisis au moins une autorisation.").parse(input.scopes);
  if (scopes.includes("admin") && !(await isAdmin(userId))) throw new DomainError("L’autorisation admin est réservée aux administrateurs.", 403);
  const [{ count }] = await rows<{ count: string }>('SELECT count(*) FROM "apiKey" WHERE "userId"=$1', [userId]);
  if (Number(count) >= maxKeys) throw new DomainError(`Limite de ${maxKeys} clés atteinte : révoque une clé inutilisée.`);
  const key = `fsc_${randomBytes(32).toString("base64url")}`;
  await rows('INSERT INTO "apiKey" (id,"userId",name,prefix,"keyHash",scopes) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), userId, name, key.slice(0, 8), hash(key), scopes]);
  return key;
}
export function listApiKeys(userId: string) {
  return rows<{ id: string; name: string; prefix: string; scopes: string[]; createdAt: Date; lastUsedAt: Date | null }>(
    'SELECT id,name,prefix,scopes,"createdAt","lastUsedAt" FROM "apiKey" WHERE "userId"=$1 ORDER BY "createdAt" DESC', [userId]);
}
export async function revokeApiKey(userId: string, id: string) {
  idSchema.parse(id);
  const deleted = await rows('DELETE FROM "apiKey" WHERE id=$1 AND "userId"=$2 RETURNING id', [id, userId]);
  if (!deleted.length) throw new DomainError("Clé introuvable.", 404);
}
export async function authenticateApiKey(key: string) {
  if (!looksLikeApiKey(key)) return null;
  const [found] = await rows<{ id: string; userId: string; scopes: string[] }>(
    'SELECT k.id,k."userId",k.scopes FROM "apiKey" k JOIN "user" u ON u.id=k."userId" WHERE k."keyHash"=$1 AND u."emailVerified"', [hash(key)]);
  if (!found) return null;
  await rows('UPDATE "apiKey" SET "lastUsedAt"=now() WHERE id=$1 AND ("lastUsedAt" IS NULL OR "lastUsedAt"<now()-interval \'1 minute\')', [found.id]);
  return { userId: found.userId, scopes: found.scopes };
}
