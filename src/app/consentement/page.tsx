import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { auth } from "../../server/auth";
import { rows } from "../../server/database";
import { ConsentForm } from "../components/consent-form";
import { requireUser } from "../../server/session";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams, params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
  const context = await auth.$context;
  if (!await verifyOAuthQueryParams(params.toString(), context.secret)) notFound();
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current?.user.emailVerified) return <p>Reconnecte le connecteur depuis Claude pour te connecter puis autoriser l’accès.</p>;
  await requireUser();
  const clientId = params.get("client_id"), scopes = (params.get("scope") || "").split(" ");
  const [client] = await rows<{ name: string | null }>('SELECT name FROM "oauthClient" WHERE "clientId"=$1', [clientId]);
  return <><h1>Autoriser {client?.name || "ce connecteur"}</h1><p>Compte : {current.user.email}</p><p>Ce connecteur pourra accéder aux événements solo de ce compte et aux événements du calendrier commun auquel tu appartiens.</p>
    <ul>{scopes.includes("calendar:read") && <li>Lister tes agendas et consulter leurs événements.</li>}{scopes.includes("event:create") && <li>Créer des événements avec des tags.</li>}{scopes.includes("offline_access") && <li>Renouveler sa connexion jusqu’à révocation.</li>}</ul><p>Tu peux révoquer cet accès à tout moment dans Connecter Claude.</p><ConsentForm />
  </>;
}
