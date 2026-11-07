import { issuer, mcpResource } from "../../../../server/config";
export function GET() { return Response.json({ resource: mcpResource, authorization_servers: [issuer], scopes_supported: ["calendar:read", "event:create"], bearer_methods_supported: ["header"] }, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }); }
