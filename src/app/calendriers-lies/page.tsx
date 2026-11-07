import Link from "next/link";
import { requireUser } from "../../server/session";
import { settings } from "../../server/calendar";
import { listLinkedCalendars } from "../../server/linked-calendars";
import { ActionForm } from "../components/action-form";
import { linkedCalendarAction, refreshLinkedCalendarAction, removeLinkedCalendarAction, toggleLinkedCalendarAction } from "../actions";

export default async function Page() {
  const user = await requireUser(), { profile, calendars } = await settings(user.id);
  const sources = await listLinkedCalendars(user.id);
  const canCommon = calendars.some(calendar => calendar.kind === "common");
  const format = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: profile.timeZone });
  return <><p><Link href="/reglages">← Réglages</Link></p><h1>Calendriers liés</h1>
    <p className="page-intro">Ajoute le lien d’abonnement ICS d’un autre calendrier. FSC récupère ses créations, modifications et suppressions environ toutes les 15 minutes, tant que le worker fonctionne.</p>
    <p className="field-help">Les événements couvrent l’année passée et les deux années à venir. Les récurrences sont affichées comme des occurrences indépendantes. Les événements liés se modifient dans le calendrier source ; tes rappels restent personnalisables dans FSC.</p>
    <details><summary>Ajouter un calendrier lié</summary>
      <ActionForm action={linkedCalendarAction}>
        <p><label>Nom du calendrier<input name="name" required maxLength={100} /></label></p>
        <p><label>Lien d’abonnement ICS<input name="url" type="url" required maxLength={4096} placeholder="https://…/calendrier.ics" autoComplete="off" spellCheck={false} /></label></p>
        <p className="field-help">Utilise un lien HTTPS ou webcal accessible sans connexion, et non l’adresse de la page web du calendrier. Ce lien peut être secret : FSC le conserve chiffré.</p>
        <fieldset className="visibility-field"><legend>Où afficher ces événements ?</legend><div className="visibility-options">
          <label className="visibility-option visibility-solo"><input name="visibility" type="radio" value="solo" required /><span>Solo</span></label>
          <label className="visibility-option visibility-common"><input name="visibility" type="radio" value="common" required disabled={!canCommon} /><span>Commun</span></label>
        </div>{!canCommon && <p>Invite une personne dans les réglages pour utiliser Commun.</p>}</fieldset>
        <p className="field-help">Avec Commun, tous les événements de ce flux seront visibles par vous deux, même s’ils sont marqués privés dans le calendrier source.</p>
        <p className="field-help">Les alertes du calendrier source ne sont pas reprises. Tes préférences de rappel FSC s’appliquent aux événements importés.</p>
        <button>Lier ce calendrier</button>
      </ActionForm>
    </details>
    {!sources.length && <p className="empty-state">Aucun calendrier lié. Ajoute un lien d’abonnement pour retrouver ses événements ici.</p>}
    {sources.map(source => <section key={source.id}>
      <h2>{source.name}</h2><p>{source.visibility === "common" ? "Commun" : "Solo"} · {source.eventCount} événement(s) · {source.enabled ? "Synchronisation active" : "En pause"}</p>
      <p className="field-help">{source.lastSyncedAt ? `Dernière actualisation : ${format.format(source.lastSyncedAt)}.` : "Pas encore actualisé."}</p>
      {source.lastError && <p role="alert">{source.lastError}</p>}
      {source.userId === user.id ? <>
        {source.enabled && <ActionForm action={refreshLinkedCalendarAction}><input type="hidden" name="id" value={source.id} /><button>Actualiser maintenant</button></ActionForm>}
        <ActionForm action={toggleLinkedCalendarAction}><input type="hidden" name="id" value={source.id} /><input type="hidden" name="enabled" value={source.enabled ? "false" : "true"} /><button>{source.enabled ? "Mettre en pause" : "Reprendre la synchronisation"}</button></ActionForm>
        <details><summary>Supprimer ce calendrier lié</summary><ActionForm action={removeLinkedCalendarAction}>
          <input type="hidden" name="id" value={source.id} /><p><label><input name="confirm" type="checkbox" required /> Supprimer ce lien et tous ses événements importés dans FSC, avec leurs rappels. Le calendrier source restera intact.</label></p><button className="button-danger">Supprimer le calendrier lié</button>
        </ActionForm></details>
      </> : <p className="field-help">Ce lien est géré par l’autre personne du calendrier commun.</p>}
    </section>)}
  </>;
}
