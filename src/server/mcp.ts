import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { auth, productionReady } from "./auth";
import { listCalendars, listEvents, saveEvent } from "./calendar";
import { eventSchema, errorMessage, DomainError } from "./validation";
import { baseURL, mcpResource } from "./config";

const metadataURL = `${baseURL}/.well-known/oauth-protected-resource/mcp`;
function unauthorized() {
  return new Response("Authentification OAuth requise.", { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${metadataURL}", scope="calendar:read event:create"`, "Cache-Control": "no-store" } });
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
  const server = new McpServer({ name: "fsc", version: "1.0.0" }, {
    instructions: "FSC est un calendrier personnel et partagé. Pour créer un événement, le choix commun (common) ou solo (solo) est obligatoire. Si l’utilisateur ne l’a pas indiqué, demande-lui de choisir avant d’appeler create_event. Utilise le calendarId renvoyé par list_calendars. Les fins de journées entières sont exclusives. Les horaires locaux utilisent un fuseau IANA ; pour une heure ambiguë, demande le décalage UTC.",
  });
  const invoke = async (scope: string, fn: () => Promise<unknown>) => {
    try {
      if (!principal.scopes.includes(scope)) throw new DomainError(`Autorisation manquante : ${scope}. Reconnecte FSC avec cette autorisation.`, 403);
      // Revalidate for every tool, including concurrent/batched protocol calls.
      await auth.api.verifyFscAccess({ body: { token } });
      const result = await fn();
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (error) { return { isError: true, content: [{ type: "text" as const, text: errorMessage(error) }] }; }
  };
  server.registerTool("list_calendars", { description: "Lister les agendas accessibles avec leur visibilité et leurs droits.", inputSchema: z.object({}) }, async () => invoke("calendar:read", async () =>
    (await listCalendars(principal.userId)).map(c => ({ id: c.id, name: c.kind === "common" ? "Commun" : "Solo", visibility: c.kind, canRead: true, canWrite: true }))));
  server.registerTool("list_events", {
    description: "Consulter les événements d’un agenda sur une plage de dates ISO 8601 avec décalage UTC. Maximum 366 jours. Utiliser nextCursor pour la suite.",
    inputSchema: z.object({ calendarId: z.string().min(1).max(200), from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }), cursor: z.string().max(20).optional() }),
  }, async input => invoke("calendar:read", () => listEvents(principal.userId, { ...input, from: new Date(input.from), to: new Date(input.to) })));
  server.registerTool("create_event", {
    description: "Créer un événement avec tags facultatifs. visibility est obligatoire : common ou solo. Si ce choix manque dans la demande, demander à l’utilisateur avant d’appeler cet outil. calendarId doit correspondre à cette visibilité.",
    inputSchema: eventSchema.extend({ calendarId: z.string().min(1).max(200) }),
  }, async input => invoke("event:create", () => saveEvent(principal.userId, input)));
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request, { parsedBody });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally { await server.close(); }
}
export { mcpResource };
