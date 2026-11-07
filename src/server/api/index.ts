import { z } from "zod";
import { authenticateApiKey } from "../api-keys";
import { auth, productionReady } from "../auth";
import { baseURL } from "../config";
import { unauthorized } from "../mcp";
import type { ToolContext } from "../mcp/context";
import { DomainError, errorMessage } from "../validation";
import { buildOpenApi, inputJsonSchema } from "./openapi";
import { matchOperation } from "./routes";
import { captureTools } from "./tools";

const headers = { "Cache-Control": "no-store" };
const fail = (message: string, status: number) => Response.json({ error: message }, { status, headers });

function coerceQuery(query: URLSearchParams, schema: z.ZodType) {
  const properties = inputJsonSchema(schema).properties ?? {};
  return Object.fromEntries([...query].map(([key, value]) => {
    const type = (properties[key] as { type?: string } | undefined)?.type;
    return [key, type === "integer" || type === "number" ? Number(value) : type === "boolean" ? value === "true" : value];
  }));
}
async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 65536) throw new DomainError("Requête trop volumineuse.", 413);
  if (!text.trim()) return {};
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new DomainError("Le corps doit être un objet JSON.");
  return body;
}

export async function handleAPI(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1/, "") || "/";
  if (request.method === "GET" && path === "/openapi.json") return Response.json(await buildOpenApi(), { headers: { "Cache-Control": "public, max-age=300" } });
  productionReady();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(baseURL).origin) return fail("Origine refusée.", 403);
  const match = matchOperation(request.method, path);
  if (!match) return fail("Route inconnue.", 404);
  const apiKey = request.headers.get("x-api-key");
  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") || "")?.[1];
  let principal: { userId: string; scopes: string[] } | null = null;
  let revalidate = async () => {};
  if (apiKey) principal = await authenticateApiKey(apiKey);
  else if (token && token.length <= 4096) {
    try { principal = await auth.api.verifyFscAccess({ body: { token } }); revalidate = async () => { await auth.api.verifyFscAccess({ body: { token } }); }; }
    catch { principal = null; }
  }
  if (!principal) return unauthorized();
  const granted = principal;
  const invoke = (async (scope: string, work: () => Promise<unknown>) => {
    if (!granted.scopes.includes(scope)) throw new DomainError(`Autorisation manquante : ${scope}.`, 403);
    await revalidate();
    return work();
  }) as unknown as ToolContext["invoke"];
  try {
    const tool = captureTools(granted.userId, invoke).get(match.operation.tool)!;
    const reads = request.method === "GET" || request.method === "DELETE";
    const input: Record<string, unknown> = { ...(reads ? coerceQuery(url.searchParams, tool.schema) : await readBody(request)), ...match.params };
    if ("confirm" in (inputJsonSchema(tool.schema).properties ?? {})) input.confirm = true;
    const result = await tool.run(tool.schema.parse(input));
    return Response.json(result ?? null, { headers });
  } catch (error) {
    if (error instanceof DomainError) return fail(error.message, error.status);
    if (error instanceof z.ZodError) return fail(errorMessage(error), 400);
    return fail(errorMessage(error), 500);
  }
}
