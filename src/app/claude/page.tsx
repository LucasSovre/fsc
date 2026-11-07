import Link from "next/link";
import { requireUser } from "../../server/session";
import { rows } from "../../server/database";
import { mcpResource } from "../../server/config";
import { ActionForm } from "../components/action-form";
import { revokeOAuthAction } from "../actions";
export default async function Page() {
  const user = await requireUser();
  const consents = await rows<{ clientId: string; name: string | null }>(`SELECT DISTINCT c."clientId",c.name FROM "oauthConsent" consent JOIN "oauthClient" c ON c."clientId"=consent."clientId" WHERE consent."userId"=$1`, [user.id]);
  return <><p><Link href="/reglages">← Réglages</Link></p><h1>Connecter Claude</h1><p>Claude peut lire tes agendas accessibles et créer des événements. Il doit te demander Commun ou Solo avant une création si tu ne l’as pas précisé.</p>
    <p><label>Adresse du serveur MCP <input readOnly value={mcpResource} /></label></p>
    <ol><li>Une fois FSC publié sur un domaine HTTPS, ouvre Personnaliser → Connecteurs dans Claude.</li><li>Ajoute un connecteur personnalisé et colle l’adresse ci-dessus.</li><li>Choisis la connexion OAuth et l’identité publiée de Claude.</li><li>Connecte-toi à FSC avec ton propre compte, vérifie les droits demandés puis autorise.</li><li>Essaie : « Liste mes agendas », puis « Crée un événement commun demain à 19 h, intitulé Dîner, avec le tag Famille ».</li></ol>
    <p>Sur un espace Team ou Enterprise, l’ajout du connecteur peut nécessiter un administrateur. Chaque personne connecte ensuite son propre compte FSC.</p>
    <h2>Connexions autorisées</h2>
    {!consents.length && <p>Aucune connexion autorisée.</p>}
    {consents.map(c => <ActionForm key={c.clientId} action={revokeOAuthAction}><input type="hidden" name="clientId" value={c.clientId} /><p>{c.name || c.clientId}</p><button>Révoquer cette connexion</button></ActionForm>)}
  </>;
}
