import { describe, expect, test } from "bun:test";
import { looksLikeApiKey } from "../src/server/api-keys";
import { buildOpenApi } from "../src/server/api/openapi";
import { matchOperation, operations } from "../src/server/api/routes";
import { captureTools, toolScopes } from "../src/server/api/tools";

describe("API REST : parité avec les outils MCP", () => {
  const tools = captureTools("", (async () => undefined) as never);
  test("chaque outil MCP a exactement une route", () => {
    expect(operations.map(o => o.tool).sort()).toEqual([...tools.keys()].sort());
  });
  test("les chemins sont uniques par méthode et résolvent leurs paramètres", () => {
    const keys = operations.map(o => `${o.method} ${o.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(matchOperation("DELETE", "/events/a%20b")).toMatchObject({ operation: { tool: "delete_event" }, params: { eventId: "a b" } });
    expect(matchOperation("POST", "/calendars/common/leave")?.operation.tool).toBe("leave_common_calendar");
    expect(matchOperation("GET", "/inconnu")).toBeNull();
  });
  test("chaque outil déclare un scope", async () => {
    for (const [name, scope] of await toolScopes()) expect([name, scope.length > 0]).toEqual([name, true]);
  });
  test("le document OpenAPI décrit toutes les routes", async () => {
    const doc = await buildOpenApi() as { openapi: string; paths: Record<string, Record<string, { operationId: string; security: unknown[]; parameters?: { name: string }[]; requestBody?: unknown }>> };
    expect(doc.openapi).toBe("3.1.0");
    const described = Object.values(doc.paths).flatMap(methods => Object.values(methods).map(m => m.operationId)).sort();
    expect(described).toEqual(operations.map(o => o.tool).sort());
    const list = doc.paths["/events"].get;
    expect(list.parameters?.map(p => p.name)).toEqual(expect.arrayContaining(["from", "to"]));
    expect(doc.paths["/events/{eventId}"].delete.parameters?.map(p => p.name)).toEqual(["eventId", "version"]);
    expect(doc.paths["/events"].post.requestBody).toBeDefined();
  });
  test("le document accepte la clé d’API en en-tête", async () => {
    const doc = await buildOpenApi() as { components: { securitySchemes: { apiKey: unknown } }; paths: Record<string, Record<string, { security: unknown[] }>> };
    expect(doc.components.securitySchemes.apiKey).toMatchObject({ type: "apiKey", in: "header", name: "X-API-Key" });
    expect(doc.paths["/todos"].get.security).toContainEqual({ apiKey: [] });
  });
  test("format des clés d’API", () => {
    expect(looksLikeApiKey(`fsc_${"a".repeat(43)}`)).toBe(true);
    expect(looksLikeApiKey("fsc_court")).toBe(false);
    expect(looksLikeApiKey("a".repeat(47))).toBe(false);
  });
});
