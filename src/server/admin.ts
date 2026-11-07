import { auth } from "./auth";
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
export type AdminUser = { id: string; name: string; email: string; emailVerified: boolean };
export async function listUsers(userId: string) {
  await assertAdmin(userId);
  return rows<AdminUser>('SELECT id,name,email,"emailVerified" FROM "user" ORDER BY "emailVerified", "createdAt" DESC');
}
export async function markEmailVerified(adminId: string, targetId: string) {
  await assertAdmin(adminId);
  const [user] = await rows<{ email: string }>('UPDATE "user" SET "emailVerified"=true, "updatedAt"=now() WHERE id=$1 RETURNING email', [targetId]);
  if (!user) throw new DomainError("Compte introuvable.", 404);
  return user.email;
}
export async function resendVerification(adminId: string, targetId: string) {
  await assertAdmin(adminId);
  const [user] = await rows<{ email: string; emailVerified: boolean }>('SELECT email,"emailVerified" FROM "user" WHERE id=$1', [targetId]);
  if (!user) throw new DomainError("Compte introuvable.", 404);
  if (user.emailVerified) throw new DomainError("Cette adresse est déjà vérifiée.");
  try { await auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: "/" } }); }
  catch (error) { throw new DomainError(`L’envoi a échoué : ${error instanceof Error ? error.message : "erreur inconnue"}`); }
  return user.email;
}
