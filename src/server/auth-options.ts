import { oauthProvider } from "@better-auth/oauth-provider";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { baseURL, mcpResource, scopes } from "./config";

export const provider = oauthProvider({
  loginPage: "/connexion", consentPage: "/consentement",
  disableJwtPlugin: true,
  scopes: [...scopes], resources: [mcpResource],
  grantTypes: ["authorization_code", "refresh_token"],
  accessTokenExpiresIn: 3600,
  clientRegistrationDefaultScopes: [...scopes],
  clientRegistrationDefaultResources: [mcpResource],
  clientRegistrationRequirePKCE: true,
  clientPrivileges: () => false,
  resourcePrivileges: () => false,
});
export const cimdPlugin = cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" });

export const authSchemaOptions = {
  baseURL,
  plugins: [provider, cimdPlugin],
  rateLimit: { enabled: true, storage: "database" as const },
};
