import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { DomainError } from "./validation";

export const MAX_CALENDAR_BYTES = 2 * 1024 * 1024;
const blocked = new BlockList();
for (const [address, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blocked.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) blocked.addSubnet(address, prefix, "ipv6");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
export function isPublicCalendarAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4") : family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}
export function calendarSourceURL(value: string) {
  if (value.length > 4096) throw new DomainError("Le lien du calendrier est trop long.");
  let url: URL;
  try { url = new URL(value.trim().replace(/^webcal:/i, "https:")); }
  catch { throw new DomainError("Indique un lien HTTPS ou webcal vers un calendrier ICS."); }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password || url.hash || !host || (isIP(host) && !isPublicCalendarAddress(host)))
    throw new DomainError("Le calendrier doit utiliser un lien HTTPS public, sans identifiants ni port personnalisé.");
  return url;
}
function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new DomainError("La clé de chiffrement de l’application n’est pas configurée.");
  return createHash("sha256").update(`fsc-linked-calendars:${secret}`).digest();
}
export function encryptCalendarURL(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function decryptCalendarURL(value: string) {
  try {
    const data = Buffer.from(value, "base64url"), decipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
  } catch { throw new DomainError("Le lien chiffré est illisible. Supprime ce calendrier lié puis ajoute-le à nouveau."); }
}
export async function fetchCalendarSource(value: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    let url = calendarSourceURL(value);
    for (let redirects = 0; redirects <= 3; redirects++) {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true, verbatim: true });
      if (!addresses.length || addresses.some(item => !isPublicCalendarAddress(item.address))) throw new DomainError("Le lien du calendrier ne pointe pas vers un serveur public autorisé.");
      const result = await new Promise<{ location?: string; text?: string }>((resolve, reject) => {
        // Pin the checked DNS results to this connection, including every redirect.
        const req = request(url, {
          signal: controller.signal,
          headers: { Accept: "text/calendar", "Accept-Encoding": "identity", "User-Agent": "FSC calendar sync" },
          lookup: (_hostname, options, callback) => options.all ? callback(null, addresses) : callback(null, addresses[0].address, addresses[0].family),
        }, response => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) { response.destroy(); resolve({ location: response.headers.location }); return; }
          if (response.statusCode !== 200 || (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity")) { response.destroy(); reject(new DomainError("Le serveur n’a pas renvoyé de calendrier ICS lisible.")); return; }
          if (Number(response.headers["content-length"] ?? 0) > MAX_CALENDAR_BYTES) { response.destroy(); reject(new DomainError("Ce calendrier dépasse la limite de 2 Mo.")); return; }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_CALENDAR_BYTES) { response.destroy(); reject(new DomainError("Ce calendrier dépasse la limite de 2 Mo.")); }
            else chunks.push(chunk);
          });
          response.on("error", reject);
          response.on("end", () => resolve({ text: Buffer.concat(chunks).toString("utf8") }));
        });
        req.on("error", reject);
        req.end();
      });
      if (result.text !== undefined) return result.text;
      if (!result.location) throw new DomainError("Le serveur a renvoyé une redirection invalide.");
      url = calendarSourceURL(new URL(result.location, url).toString());
    }
    throw new DomainError("Le lien du calendrier contient trop de redirections.");
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("Impossible de télécharger le calendrier. Vérifie son lien de partage ICS et réessaie.");
  } finally { clearTimeout(timer); }
}
