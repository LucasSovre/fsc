import { parseArgs } from "node:util";
import { z } from "zod";
import { auth } from "../src/server/auth";
import { pool } from "../src/server/database";

async function main() {
  const { values } = parseArgs({ options: { email: { type: "string" }, resend: { type: "boolean" }, help: { type: "boolean" } } });
  if (values.help) {
    console.log("Vérifier une adresse : --email personne@example.com");
    console.log("Renvoyer l’e-mail de vérification : --email personne@example.com --resend");
    return;
  }
  const email = z.email().max(254).parse(values.email?.trim().toLowerCase());
  const { rows } = await pool.query('SELECT "emailVerified" FROM "user" WHERE email=$1', [email]);
  if (!rows.length) throw new Error("Aucun compte avec cette adresse.");
  if (rows[0].emailVerified) throw new Error("Cette adresse est déjà vérifiée.");
  if (values.resend) {
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/" } });
    console.log("E-mail de vérification envoyé.");
    return;
  }
  await pool.query('UPDATE "user" SET "emailVerified"=true, "updatedAt"=now() WHERE email=$1', [email]);
  console.log("Adresse marquée comme vérifiée.");
}

try { await main(); }
catch (error) {
  console.error(error instanceof z.ZodError ? "Paramètre invalide : --email valide requis."
    : error instanceof Error && ["Aucun compte avec cette adresse.", "Cette adresse est déjà vérifiée."].includes(error.message) ? error.message
    : "Opération impossible. Vérifie la base et la configuration SMTP.");
  process.exitCode = 1;
} finally { await pool.end(); }
