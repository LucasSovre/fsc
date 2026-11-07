import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { z } from "zod";
import { createCLIAuth } from "../src/server/auth";
import { pool } from "../src/server/database";

async function hiddenPassword(label: string) {
  process.stdout.write(label);
  const output = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  prompt.on("SIGINT", () => { prompt.close(); process.exitCode = 1; });
  try { return await prompt.question(""); }
  finally { prompt.close(); process.stdout.write("\n"); }
}

async function main() {
  const { values } = parseArgs({ options: {
    email: { type: "string" }, name: { type: "string" },
    "password-stdin": { type: "boolean" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("Créer un compte : --email personne@example.com --name Prénom [--password-stdin]");
    return;
  }
  const email = z.email().max(254).parse(values.email?.trim().toLowerCase());
  const name = z.string().trim().min(1).max(100).parse(values.name);
  const existing = await pool.query('SELECT id FROM "user" WHERE email=$1', [email]);
  if (existing.rowCount) throw new Error("Un compte existe déjà avec cette adresse.");
  let password: string;
  if (values["password-stdin"]) {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += Buffer.byteLength(chunk);
      if (size > 4096) throw new Error("Entrée trop longue.");
      chunks.push(Buffer.from(chunk));
    }
    password = Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  } else {
    if (!process.stdin.isTTY) throw new Error("Utilise --password-stdin sans terminal interactif.");
    password = await hiddenPassword("Mot de passe (12 caractères minimum, saisie masquée) : ");
    if (password !== await hiddenPassword("Confirmer le mot de passe : "))
      throw new Error("Les mots de passe ne correspondent pas.");
  }
  z.string().min(12).max(128).parse(password);
  await createCLIAuth().api.signUpEmail({ body: { email, name, password, callbackURL: "/" } });
  console.log("Compte créé. Consulte l’e-mail de vérification avant de te connecter.");
}

try { await main(); }
catch (error) {
  // Never print provider errors or database connection details containing secrets.
  console.error(error instanceof z.ZodError
    ? "Paramètres invalides : --email valide, --name requis, mot de passe de 12 à 128 caractères."
    : error instanceof Error && ["Un compte existe déjà avec cette adresse.", "Entrée trop longue.", "Utilise --password-stdin sans terminal interactif.", "Les mots de passe ne correspondent pas."].includes(error.message)
      ? error.message
      : "Création impossible. Vérifie les paramètres, la base et le SMTP. Si le compte existe déjà, utilise la vérification d’adresse à la connexion.");
  process.exitCode = 1;
} finally { await pool.end(); }
