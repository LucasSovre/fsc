import { rows } from "./database";
import { testSmtp } from "./mail";
import { DomainError } from "./validation";

export async function isAdmin(userId: string) {
  return (await rows('SELECT "userId" FROM "appAdmin" WHERE "userId"=$1', [userId])).length > 0;
}
export async function assertAdmin(userId: string) {
  if (!(await isAdmin(userId))) throw new DomainError("Cette action est réservée aux administrateurs.", 403);
}
export async function sendSmtpTest(userId: string) {
  await assertAdmin(userId);
  const [user] = await rows<{ email: string }>('SELECT email FROM "user" WHERE id=$1', [userId]);
  try { await testSmtp(user.email); }
  catch (error) { throw new DomainError(`Le test SMTP a échoué : ${error instanceof Error ? error.message : "erreur inconnue"}`); }
  return user.email;
}
