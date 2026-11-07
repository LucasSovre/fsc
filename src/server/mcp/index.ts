import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { auth, productionReady } from "../auth";
import { errorMessage, DomainError } from "../validation";
import { baseURL, mcpResource, scopes } from "../config";
import { registerAdminTools } from "./admin";
import type { ToolContext } from "./context";
import { registerEventTools } from "./events";
import { registerLinkedTools } from "./linked";
import { registerSettingsTools } from "./settings";
import { registerTodoTools } from "./todos";

const metadataURL = `${baseURL}/.well-known/oauth-protected-resource/mcp`;
const instructions = [
  "FSC est un calendrier personnel et partagé ; ces outils permettent tout ce que fait le site.",
  "Pour créer un événement, une tâche ou lier un calendrier, le choix commun (common) ou solo (solo) est obligatoire : si l’utilisateur ne l’a pas indiqué, demande-lui avant d’appeler l’outil.",
  "Utilise le calendarId renvoyé par list_calendars. Les fins de journées entières sont exclusives. Les horaires locaux utilisent un fuseau IANA ; pour une heure ambiguë, demande le décalage UTC.",
  "Pour modifier ou supprimer, lis d’abord l’élément pour obtenir sa version ; un conflit de version signifie qu’il faut relire.",
  "Demande toujours l’accord explicite de l’utilisateur avant une action destructive ou sensible (suppressions, quitter le Commun, invitations, liens d’abonnement, révocation de connexion, SMTP) puis passe confirm à true quand l’outil l’exige.",
  "Les adresses secrètes (liens d’invitation ou d’abonnement) ne doivent être montrées qu’à l’utilisateur.",
].join(" ");
function unauthorized() {
  return new Response("Authentification OAuth requise.", { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${metadataURL}", scope="${scopes.filter(s => s !== "offline_access").join(" ")}"`, "Cache-Control": "no-store" } });
}
export async function handleMCP(request: Request) {
  productionReady();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(baseURL).origin) return new Response("Origine refusée.", { status: 403 });
  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token || token.length > 4096) return unauthorized();
  let principal;
  try {
    principal = await auth.api.verifyFscAccess({ body: { token } });
  } catch { return unauthorized(); }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();
  let length = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) { await reader.cancel(); return new Response("Requête trop volumineuse.", { status: 413 }); }
      chunks.push(value);
    }
  }
  let parsedBody;
  try { parsedBody = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return Response.json({ jsonrpc: "2.0", error: { code: -32700, message: "JSON invalide" }, id: null }, { status: 400 }); }
  const server = new McpServer({ name: "fsc", version: "2.0.0" }, { instructions });
  const invoke: ToolContext["invoke"] = async (scope, fn) => {
    try {
      if (!principal.scopes.includes(scope)) throw new DomainError(`Autorisation manquante : ${scope}. Reconnecte FSC avec cette autorisation.`, 403);
      // Revalidate for every tool, including concurrent/batched protocol calls.
      await auth.api.verifyFscAccess({ body: { token } });
      const result = await fn();
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (error) { return { isError: true, content: [{ type: "text" as const, text: errorMessage(error) }] }; }
  };
  const context: ToolContext = { server, userId: principal.userId, invoke };
  for (const register of [registerEventTools, registerTodoTools, registerSettingsTools, registerLinkedTools, registerAdminTools]) register(context);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request, { parsedBody });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally { await server.close(); }
}
export { mcpResource };
