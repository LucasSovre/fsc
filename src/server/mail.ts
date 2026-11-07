import nodemailer from "nodemailer";
import { getSmtpConfig, type SmtpConfig } from "./smtp";

function transportFor(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.password } : undefined,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
  });
}
export async function sendMail(to: string, subject: string, text: string) {
  const config = await getSmtpConfig();
  if (!config) throw new Error("Le service e-mail n’est pas configuré.");
  const transport = transportFor(config);
  try { await transport.sendMail({ from: config.from, to, subject, text }); }
  finally { transport.close(); }
}
export async function testSmtp(to: string) {
  const config = await getSmtpConfig();
  if (!config) throw new Error("Enregistre d’abord la configuration SMTP.");
  const transport = transportFor(config);
  try {
    await transport.verify();
    await transport.sendMail({ from: config.from, to, subject: "Test SMTP FSC", text: "La configuration SMTP de FSC fonctionne." });
  } finally { transport.close(); }
}
