import { z } from "zod";
import { baseURL, issuer, scopes as oauthScopes } from "../config";
import { operations } from "./routes";
import { captureTools, toolScopes } from "./tools";

type JsonSchema = { properties?: Record<string, object>; required?: string[] };
const hidden = ["confirm"];
export const inputJsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { unrepresentable: "any", io: "input" }) as JsonSchema;
const errorResponse = (description: string) => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } });

export async function buildOpenApi() {
  const tools = captureTools("", (async () => undefined) as never);
  const toolScope = await toolScopes();
  const paths: Record<string, Record<string, unknown>> = {};
  for (const { tool, method, path, summary, tag } of operations) {
    const definition = tools.get(tool);
    if (!definition) throw new Error(`Outil MCP introuvable : ${tool}`);
    const schema = inputJsonSchema(definition.schema), required = schema.required ?? [];
    const pathNames = [...path.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
    const fields = Object.entries(schema.properties ?? {}).filter(([name]) => !pathNames.includes(name) && !hidden.includes(name));
    const parameters: object[] = pathNames.map(name => ({ name, in: "path", required: true, schema: schema.properties?.[name] ?? { type: "string" } }));
    const readsQuery = method === "GET" || method === "DELETE";
    if (readsQuery) parameters.push(...fields.map(([name, field]) => ({ name, in: "query", required: required.includes(name), schema: field })));
    const body = { type: "object", properties: Object.fromEntries(fields), required: required.filter(name => fields.some(([field]) => field === name)) };
    (paths[path] ??= {})[method.toLowerCase()] = {
      operationId: tool, tags: [tag], summary, description: definition.description,
      security: [{ oauth2: [toolScope.get(tool)] }],
      ...(parameters.length ? { parameters } : {}),
      ...(!readsQuery && fields.length ? { requestBody: { required: body.required.length > 0, content: { "application/json": { schema: body } } } } : {}),
      responses: {
        200: { description: "Succès", content: { "application/json": { schema: {} } } },
        400: errorResponse("Requête invalide"), 401: errorResponse("Authentification requise"), 403: errorResponse("Autorisation manquante"),
        404: errorResponse("Élément introuvable"), 409: errorResponse("Conflit de version : relire l’élément"),
      },
    };
  }
  const scopes = Object.fromEntries(oauthScopes.map(scope => [scope, scope === "offline_access" ? "Rotation des refresh tokens" : `Scope ${scope}`]));
  return {
    openapi: "3.1.0",
    info: {
      title: "API FSC", version: "2.0.0",
      description: "Équivalent REST des outils MCP de FSC. Mêmes jetons OAuth (audience `/mcp`), mêmes scopes, mêmes règles métier. Les suppressions et révocations n’exigent pas de `confirm` : l’appel explicite vaut confirmation. Les corps sont en JSON ; pour GET et DELETE, les champs d’entrée passent en paramètres de requête.",
    },
    servers: [{ url: `${baseURL}/api/v1` }],
    tags: [...new Set(operations.map(operation => operation.tag))].map(name => ({ name })),
    paths,
    components: {
      schemas: { Error: { type: "object", required: ["error"], properties: { error: { type: "string" } } } },
      securitySchemes: { oauth2: { type: "oauth2", flows: { authorizationCode: { authorizationUrl: `${issuer}/oauth2/authorize`, tokenUrl: `${issuer}/oauth2/token`, scopes } } } },
    },
  };
}
