import { issuer, mcpResource, scopes } from "../../../../server/config";
export function GET() { return Response.json({ resource: mcpResource, authorization_servers: [issuer], scopes_supported: scopes.filter(s => s !== "offline_access"), bearer_methods_supported: ["header"] }, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }); }
