import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, productionReady } from "./auth";
import { initializeAccount } from "./calendar";
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
export { isAdmin, assertAdmin } from "./admin";
