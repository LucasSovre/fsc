import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, productionReady } from "./auth";
import { initializeAccount } from "./calendar";
import { rows } from "./database";
import { DomainError } from "./validation";
export async function session() {
  productionReady();
  return auth.api.getSession({ headers: await headers() });
}
export async function requireUser() {
  const current = await session();
  if (!current?.user.emailVerified) redirect("/connexion");
  await initializeAccount(current.user.id, (await cookies()).get("fsc_timezone")?.value);
  return current.user;
}
export async function isAdmin(userId: string) {
  return (await rows('SELECT "userId" FROM "appAdmin" WHERE "userId"=$1', [userId])).length > 0;
}
export async function assertAdmin(userId: string) {
  if (!(await isAdmin(userId))) throw new DomainError("Cette action est réservée aux administrateurs.", 403);
}
