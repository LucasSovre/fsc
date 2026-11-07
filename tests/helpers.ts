import { randomUUID } from "node:crypto";
import { auth, createCLIAuth } from "../src/server/auth";
import { baseURL } from "../src/server/config";
import { databaseUrl } from "../src/server/database-url";
import { saveSmtpConfig } from "../src/server/smtp";

export function assertTestDatabase() {
  const url = new URL(databaseUrl());
  if (!url.pathname.endsWith("_test")) throw new Error("Les tests d’intégration exigent une base dont le nom finit par _test.");
}
export const password = "Fsc-test-only-123456789!";
let requestNumber = Math.floor(Math.random() * 10_000);
export async function authRequest(path: string, body?: unknown, cookie?: string) {
  const headers = new Headers({ Origin: baseURL, "X-Forwarded-For": `2001:db8:${(++requestNumber).toString(16)}::1` });
  const oauthForm = path === "/oauth2/token" || path === "/oauth2/revoke";
  if (body !== undefined) headers.set("Content-Type", oauthForm ? "application/x-www-form-urlencoded" : "application/json");
  if (cookie) headers.set("Cookie", cookie);
  return auth.handler(new Request(`${baseURL}/api/auth${path}`, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : oauthForm ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body) }));
}
export async function seedSmtp() {
  assertTestDatabase();
  await saveSmtpConfig({ host: process.env.SMTP_HOST || "127.0.0.1", port: Number(process.env.SMTP_PORT || 1025), secure: false, from: "FSC <fsc@fsc.test>" });
}
export async function register(name = "Compte") {
  await seedSmtp();
  const email = `${randomUUID()}@fsc.test`;
  await createCLIAuth().api.signUpEmail({ body: { name, email, password, callbackURL: "/" } });
  const mailbox = process.env.MAILPIT_URL || "http://127.0.0.1:18025";
  const result = await fetch(`${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then(r => r.json()) as { messages: { ID: string }[] };
  if (!result.messages.length) throw new Error("E-mail de vérification introuvable.");
  const message = await fetch(`${mailbox}/api/v1/message/${result.messages[0].ID}`).then(r => r.json()) as { Text: string };
  const link = message.Text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!link) throw new Error("Lien de vérification introuvable.");
  const verified = await auth.handler(new Request(link, { headers: { "X-Forwarded-For": `2001:db8:${(++requestNumber).toString(16)}::1` } }));
  if (verified.status >= 400) throw new Error(`Vérification : ${verified.status} ${await verified.text()}`);
  const login = await authRequest("/sign-in/email", { email, password });
  if (!login.ok) throw new Error(`Connexion : ${login.status} ${await login.text()}`);
  const cookie = login.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
  if (!session?.user.emailVerified) throw new Error("Session vérifiée introuvable.");
  return { id: session.user.id, email, cookie };
}
