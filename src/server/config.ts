export const baseURL = (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
export const mcpResource = `${baseURL}/mcp`;
export const issuer = `${baseURL}/api/auth`;
export const scopes = ["calendar:read", "event:create", "offline_access"] as const;

export function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("BETTER_AUTH_SECRET doit contenir au moins 32 caractères.");
  if (!baseURL.startsWith("https://")) throw new Error("BETTER_AUTH_URL doit utiliser HTTPS en production.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est obligatoire.");
  if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST est obligatoire pour les e-mails de connexion.");
}
