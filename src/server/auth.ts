import { betterAuth } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { getOAuthProviderApi } from "@better-auth/oauth-provider";
import { z } from "zod";
import { pool } from "./database";
import { authSchemaOptions, provider, cimdPlugin } from "./auth-options";
import { assertProductionConfig, baseURL, mcpResource } from "./config";
import { sendMail } from "./mail";

const createAuth = () => betterAuth({
  ...authSchemaOptions,
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || "fsc-local-development-secret-change-me-123456",
  trustedOrigins: [baseURL],
  advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] } },
  emailAndPassword: {
    enabled: true, requireEmailVerification: true, minPasswordLength: 12,
    sendResetPassword: async ({ user, url }) => sendMail(user.email, "FSC — nouveau mot de passe", `Choisis un nouveau mot de passe : ${url}`),
  },
  emailVerification: {
    sendOnSignUp: true, autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => sendMail(user.email, "FSC — vérifie ton adresse", `Vérifie ton adresse e-mail : ${url}`),
  },
  session: { cookieCache: { enabled: false } },
  plugins: [provider, cimdPlugin, {
    id: "fsc-resource-verification",
    endpoints: {
      verifyFscAccess: createAuthEndpoint.serverOnly({ method: "POST", body: z.object({ token: z.string() }) }, async ctx => {
        const payload = await getOAuthProviderApi(ctx, provider.options).requireActiveAccessToken(ctx.body.token);
        const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!aud.includes(mcpResource) || typeof payload.sub !== "string" || payload.cnf)
          throw new APIError("UNAUTHORIZED", { message: "Jeton FSC invalide." });
        const consent = await pool.query('SELECT id FROM "oauthConsent" WHERE "userId"=$1 AND "clientId"=$2 LIMIT 1', [payload.sub, payload.client_id]);
        if (!consent.rows.length) throw new APIError("UNAUTHORIZED", { message: "Connexion révoquée." });
        return { userId: payload.sub, scopes: String(payload.scope || "").split(" ") };
      }),
    },
  }],
});

// Better Auth initializes its database and resource registry eagerly. Defer it
// until a request so Next can build without a database or deployment secrets.
let instance: ReturnType<typeof createAuth> | undefined;
function configuredAuth() {
  assertProductionConfig();
  return instance ??= createAuth();
}
export const auth = {
  get api() { return configuredAuth().api; },
  get $context() { return configuredAuth().$context; },
  handler(request: Request) { return configuredAuth().handler(request); },
};

export function productionReady() { assertProductionConfig(); }
