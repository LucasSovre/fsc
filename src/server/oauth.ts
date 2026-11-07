import { transaction } from "./database";
import { account } from "./calendar";
import { z } from "zod";
export async function revokeConnection(userId: string, clientId: string) {
  z.string().min(1).max(2048).parse(clientId);
  await transaction(async db => {
    await account(db, userId);
    await db.query('DELETE FROM "oauthAccessToken" WHERE "userId"=$1 AND "clientId"=$2', [userId, clientId]);
    await db.query('DELETE FROM "oauthRefreshToken" WHERE "userId"=$1 AND "clientId"=$2', [userId, clientId]);
    await db.query('DELETE FROM "oauthConsent" WHERE "userId"=$1 AND "clientId"=$2', [userId, clientId]);
  });
}
