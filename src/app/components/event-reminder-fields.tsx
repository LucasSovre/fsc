"use client";

import Link from "next/link";
import { useState } from "react";
import type { EventReminderChoice, Profile } from "../../server/types";

export function EventReminderFields({ initial = { mode: "inherit" }, defaults }: { initial?: EventReminderChoice; defaults: Pick<Profile, "reminderMinutes" | "emailEnabled" | "pushEnabled"> }) {
  const [mode, setMode] = useState(initial.mode);
  const values = initial.mode === "custom" ? initial : defaults;
  const minutes = values.reminderMinutes;
  const unit = minutes > 0 && minutes % 1440 === 0 ? 1440 : minutes > 0 && minutes % 60 === 0 ? 60 : 1;
  return <fieldset className="event-reminder-fields"><legend>Mon rappel</legend>
    <p className="field-help">Ce choix s’applique uniquement à toi, même pour un événement commun.</p>
    <p><label>Quand être prévenu ?<select name="eventReminderMode" value={mode} onChange={event => setMode(event.target.value as EventReminderChoice["mode"])}>
      <option value="inherit">Utiliser mes réglages habituels</option>
      <option value="off">Aucun rappel</option>
      <option value="custom">Personnaliser ce rappel</option>
    </select></label></p>
    {mode === "inherit" && <p className="field-help">Le délai, les canaux et les filtres de tags définis dans tes <Link href="/reglages">réglages</Link> s’appliquent.</p>}
    {mode === "custom" && <>
      <div className="reminder-delay"><label>Délai avant l’événement<input name="eventReminderValue" type="number" min={0} max={525600} step={1} required defaultValue={minutes / unit} /></label>
        <label>Unité<select name="eventReminderUnit" defaultValue={unit}><option value="1">minutes</option><option value="60">heures</option><option value="1440">jours</option></select></label>
      </div>
      <p><label><input type="checkbox" name="eventReminderEmail" defaultChecked={values.emailEnabled} /> E-mail</label>
        <label><input type="checkbox" name="eventReminderPush" defaultChecked={values.pushEnabled} /> Notification web</label></p>
      <p className="field-help">Choisis au moins un canal. Ce rappel remplace tes réglages habituels pour cet événement, y compris le filtre de tags. Pour les notifications web, active d’abord un appareil dans les <Link href="/reglages">réglages</Link>.</p>
      <p className="field-help">0 minute : à l’heure de début. Journée entière : délai calculé avant 9 h dans ton fuseau. Maximum : un an.</p>
    </>}
  </fieldset>;
}
