import Link from "next/link";
import { listUsers } from "../../server/admin";
import { isAdmin, requireUser } from "../../server/session";
import { getSmtpSummary } from "../../server/smtp";
import { settings } from "../../server/calendar";
import { rows } from "../../server/database";
import { ActionForm } from "../components/action-form";
import { feedAction, inviteAction, leaveAction, preferencesAction, revokeInvitationAction, resendVerificationAction, smtpAction, smtpTestAction, verifyUserAction } from "../actions";
import { PushSettings } from "../components/push-settings";
import { ZoneInput } from "../components/event-fields";
export default async function Page() {
  const user = await requireUser(), state = await settings(user.id), p = state.profile;
  const feeds = await rows<{ calendarId: string }>('SELECT "calendarId" FROM feed WHERE "userId"=$1', [user.id]);
  const admin = await isAdmin(user.id), smtp = { admin, config: admin ? await getSmtpSummary() : null }, users = admin ? await listUsers(user.id) : [];
  return <><h1>Réglages</h1>
    <h2>Mes rappels</h2><p>Ces préférences s’appliquent à tes événements solo et aux événements communs, uniquement pour toi.</p>
    <ActionForm action={preferencesAction}>
      <p><ZoneInput initial={p.timeZone} /></p>
      <p><label>Délai avant l’événement (minutes) <input name="reminderMinutes" type="number" min={0} max={525600} defaultValue={p.reminderMinutes} required /></label></p>
      <p>Pour une journée entière, le délai est calculé avant 9 h le premier jour, dans ton fuseau.</p>
      <fieldset><legend>Canaux</legend>
        <p><label><input type="checkbox" name="emailEnabled" defaultChecked={p.emailEnabled} /> E-mail</label></p>
        <p><label><input type="checkbox" name="pushEnabled" defaultChecked={p.pushEnabled} /> Notifications web</label></p>
      </fieldset>
      <fieldset><legend>Quels événements ?</legend>
        <p><label><input type="radio" name="reminderMode" value="all" defaultChecked={p.reminderMode === "all"} /> Tous les événements, y compris sans tag</label></p>
        <p><label><input type="radio" name="reminderMode" value="tags" defaultChecked={p.reminderMode === "tags"} /> Tags sélectionnés</label></p>
        {state.tags.map(tag => <p key={tag.key}><label><input type="checkbox" name="selectedTags" value={tag.key} defaultChecked={p.selectedTags.includes(tag.key)} /> {tag.label}</label></p>)}
        <p>Un seul tag correspondant suffit. Un événement qui porte plusieurs tags choisis ne déclenche qu’un rappel par canal. Sans tag sélectionné, ce mode n’envoie aucun rappel.</p>
      </fieldset><button>Enregistrer mes réglages</button>
    </ActionForm>
    <PushSettings publicKey={process.env.VAPID_PUBLIC_KEY || ""} />
    <section><h2>Connexions</h2>
      <ul><li><Link href="/calendriers-lies">Calendriers liés</Link></li><li><Link href="/claude">Connecter Claude</Link></li></ul>
    </section>
    <section><h2>Calendrier commun</h2>
      {state.members.length ? <ul>{state.members.map(m => <li key={m.email}>{m.name} · {m.email}</li>)}</ul> : <p>Tu n’as pas encore de calendrier commun.</p>}
      {state.members.length < 2 && <ActionForm action={inviteAction}><p><label>E-mail de la personne à inviter <input name="email" type="email" required /></label></p><button>Inviter à partager mon calendrier</button></ActionForm>}
      {state.invitations.map(i => <ActionForm action={revokeInvitationAction} key={i.id}><input type="hidden" name="id" value={i.id} /><p>Invitation à {i.email}, expire le {i.expiresAt.toLocaleDateString("fr-FR", { timeZone: p.timeZone })}.</p><button className="button-danger">Révoquer cette invitation</button></ActionForm>)}
      {state.members.length > 0 && <ActionForm action={leaveAction}><p>En quittant, tu perds l’accès aux événements communs et leurs rappels. L’autre personne conserve le calendrier.</p><p><label><input type="checkbox" name="confirm" required /> Je confirme mon départ.</label></p><button className="button-danger">Quitter le calendrier commun</button></ActionForm>}
    </section>
    <section><h2>Calendriers du téléphone</h2><p>Exporte un fichier ou abonne-toi séparément à chaque agenda. Le téléphone choisit la fréquence d’actualisation et peut conserver des copies déjà téléchargées.</p><p>Le lien d’abonnement donne accès à cet agenda : conserve-le comme un secret. Renouvelle-le si tu l’as partagé par erreur.</p>
      <details><summary>Afficher les exports et abonnements</summary>
      {state.calendars.map(c => <section key={c.id}><h3>{c.kind === "solo" ? "Solo" : "Commun"}</h3>
        <p><a href={`/exports/${c.id}.ics`}>Télécharger le fichier .ics<span className="sr-only"> ({c.kind === "solo" ? "Solo" : "Commun"})</span></a></p>
        <ActionForm action={feedAction}><input type="hidden" name="calendarId" value={c.id} />
          <p><button name="operation" value="rotate">Créer ou renouveler le lien d’abonnement<span className="sr-only"> ({c.kind === "solo" ? "Solo" : "Commun"})</span></button></p>
        </ActionForm>
        <ActionForm action={feedAction}><input type="hidden" name="calendarId" value={c.id} />
          <p><label><input type="checkbox" required disabled={!feeds.some(f => f.calendarId === c.id)} /> Confirmer la révocation du lien actuel<span className="sr-only"> ({c.kind === "solo" ? "Solo" : "Commun"})</span></label></p>
          <p><button className="button-danger" name="operation" value="revoke" disabled={!feeds.some(f => f.calendarId === c.id)}>Révoquer le lien d’abonnement<span className="sr-only"> ({c.kind === "solo" ? "Solo" : "Commun"})</span></button></p>
        </ActionForm>
      </section>)}
      </details>
    </section>
    {smtp.admin && <section><h2>E-mail (SMTP)</h2><details open={!smtp.config}><summary>Configuration du serveur</summary><p>Serveur utilisé pour les e-mails de connexion, les invitations et les rappels. Réservé aux administrateurs.</p>
      <ActionForm action={smtpAction}>
        <p><label>Hôte <input name="host" defaultValue={smtp.config?.host ?? ""} required /></label></p>
        <p><label>Port <input name="port" type="number" min={1} max={65535} defaultValue={smtp.config?.port ?? 587} required /></label></p>
        <p><label><input type="checkbox" name="secure" defaultChecked={smtp.config?.secure ?? false} /> Connexion sécurisée (TLS direct, port 465)</label></p>
        <p><label>Utilisateur <input name="user" autoComplete="off" defaultValue={smtp.config?.user ?? ""} /></label></p>
        <p><label>Mot de passe <input name="password" type="password" autoComplete="new-password" placeholder={smtp.config?.hasPassword ? "Inchangé" : ""} /></label></p>
        <p><label>Expéditeur <input name="from" defaultValue={smtp.config?.from} placeholder="FSC <fsc@exemple.fr>" required /></label></p>
        <button>Enregistrer la configuration SMTP</button>
      </ActionForm>
      <ActionForm action={smtpTestAction}>
        <p>Envoie un e-mail de test à ton adresse avec la configuration enregistrée.</p>
        <button disabled={!smtp.config}>Tester le SMTP</button>
      </ActionForm>
    </details></section>}
    {smtp.admin && <section><h2>Comptes</h2><p>Vérifie une adresse à la main ou renvoie l’e-mail de vérification.</p>
      <ul>{users.map(u => <li key={u.id}><strong>{u.name}</strong> ({u.email}) — {u.emailVerified ? "adresse vérifiée" : "adresse non vérifiée"}
        {!u.emailVerified && <>
          <ActionForm action={verifyUserAction}><input type="hidden" name="userId" value={u.id} /><button>Marquer comme vérifiée<span className="sr-only"> ({u.email})</span></button></ActionForm>
          <ActionForm action={resendVerificationAction}><input type="hidden" name="userId" value={u.id} /><button>Renvoyer l’e-mail de vérification<span className="sr-only"> ({u.email})</span></button></ActionForm>
        </>}</li>)}</ul>
    </section>}
  </>;
}
