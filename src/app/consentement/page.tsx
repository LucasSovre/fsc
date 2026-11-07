import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { auth } from "../../server/auth";
import { rows } from "../../server/database";
import { ConsentForm } from "../components/consent-form";
import { requireUser } from "../../server/session";
const scopeLabels: Record<string, string> = {
  "calendar:read": "Consulter tes agendas, événements, tâches, réglages, calendriers liés et déplacements.",
  "event:write": "Créer, modifier et supprimer des événements et régler tes rappels.",
  "todo:write": "Créer, modifier, terminer et supprimer des tâches.",
  "settings:write": "Modifier tes réglages, gérer les invitations, quitter le calendrier commun, gérer les liens d’abonnement et les connexions autorisées.",
  "linked:write": "Ajouter, actualiser, mettre en pause et supprimer des calendriers liés.",
  "travel:write": "Marquer ou retirer tes jours de déplacement.",
  "admin": "Consulter, modifier et tester la configuration SMTP (administrateurs).",
  "offline_access": "Renouveler sa connexion jusqu’à révocation.",
};
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
    <ul>{scopes.filter(scope => scope in scopeLabels).map(scope => <li key={scope}>{scopeLabels[scope]}</li>)}</ul><p>Tu peux révoquer cet accès à tout moment dans Connecter Claude.</p><ConsentForm />
  </>;
}
