export const baseURL = (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
export const mcpResource = `${baseURL}/mcp`;
export const issuer = `${baseURL}/api/auth`;
export const scopes = ["calendar:read", "event:write", "todo:write", "settings:write", "linked:write", "travel:write", "admin", "offline_access"] as const;

export function assertPublicURL(value: string) {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("BETTER_AUTH_URL doit être une URL valide."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
    throw new Error("BETTER_AUTH_URL doit utiliser HTTPS, ou HTTP sur localhost pour un usage local.");
}

export function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("BETTER_AUTH_SECRET doit contenir au moins 32 caractères.");
  assertPublicURL(baseURL);
  if (!process.env.POSTGRES_PASSWORD) throw new Error("POSTGRES_PASSWORD est obligatoire.");}
