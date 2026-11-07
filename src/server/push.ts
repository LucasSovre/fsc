import { randomUUID } from "node:crypto";
import { z } from "zod";
import { rows, transaction } from "./database";
import { account } from "./calendar";
import { DomainError } from "./validation";

const subscriptionSchema = z.object({
  endpoint: z.url().max(4096).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      (url.hostname === "fcm.googleapis.com" || url.hostname === "web.push.apple.com" ||
       url.hostname.endsWith(".push.services.mozilla.com") || url.hostname.endsWith(".notify.windows.com"));
  }, "Service de notifications non reconnu."),
  keys: z.object({ p256dh: z.string().regex(/^[\w-]{87,88}={0,2}$/), auth: z.string().regex(/^[\w-]{22,24}={0,2}$/) }),
  expirationTime: z.number().nullable().optional(),
});
export async function addPushSubscription(userId: string, raw: unknown) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) throw new DomainError("Notifications web non configurées.");
  const input = subscriptionSchema.parse(raw);
  return transaction(async db => {
    await account(db, userId);
    const [existing] = await rows<{ userId: string }>('SELECT "userId" FROM "pushSubscription" WHERE endpoint=$1', [input.endpoint], db);
    if (existing && existing.userId !== userId) throw new DomainError("Désactive les notifications de cet appareil puis active-les à nouveau.");
    await db.query(`INSERT INTO "pushSubscription"(id,"userId",endpoint,subscription) VALUES($1,$2,$3,$4)
      ON CONFLICT(endpoint) DO UPDATE SET subscription=$4`, [randomUUID(), userId, input.endpoint, JSON.stringify(input)]);
  });
}
export async function removePushSubscription(userId: string, endpoint: string) {
  return transaction(async db => { await account(db, userId); await db.query('DELETE FROM "pushSubscription" WHERE "userId"=$1 AND endpoint=$2', [userId, endpoint]); });
}
