import { z } from "zod";
import { assertAdmin, sendSmtpTest } from "../admin";
import { getSmtpSummary, saveSmtpConfig } from "../smtp";
import type { ToolContext } from "./context";

export function registerAdminTools({ server, userId, invoke }: ToolContext) {
  server.registerTool("get_smtp_config", { description: "Lire la configuration SMTP sans le mot de passe. Réservé aux administrateurs.", inputSchema: z.object({}) },
    async () => invoke("admin", async () => { await assertAdmin(userId); return getSmtpSummary(); }));
  server.registerTool("save_smtp_config", {
    description: "Enregistrer la configuration SMTP (administrateurs). Un mot de passe vide conserve l’actuel. Demander confirmation avant d’écraser une configuration existante.",
    inputSchema: z.object({ host: z.string().max(253), port: z.number().int(), secure: z.boolean(), user: z.string().max(254).default(""), password: z.string().max(1000).default(""), from: z.string().max(254) }),
  }, async input => invoke("admin", async () => { await assertAdmin(userId); await saveSmtpConfig(input); return { saved: true }; }));
  server.registerTool("test_smtp", { description: "Envoyer un e-mail de test à l’administrateur connecté.", inputSchema: z.object({}) },
    async () => invoke("admin", async () => ({ sentTo: await sendSmtpTest(userId) })));
}
