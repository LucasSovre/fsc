"use client";
import { useState } from "react";
export function EventDates({ initial }: { initial: { allDay: boolean; start: string; end: string; startDate: string; endDate: string; timeZone: string } }) {
  const [allDay, setAllDay] = useState(initial.allDay);
  return <fieldset>
    <legend>Date et heure</legend>
    <p><label><input type="checkbox" name="allDay" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> Journée entière</label></p>
    {allDay ? <>
      <p><label>Premier jour <input type="date" name="startDate" defaultValue={initial.startDate} required /></label></p>
      <p><label>Dernier jour (inclus) <input type="date" name="endDate" defaultValue={initial.endDate} required /></label></p>
      <p className="field-help">Pour une seule journée, choisis la même date.</p>
    </> : <>
      <p><label>Début <input type="datetime-local" name="start" defaultValue={initial.start} required /></label></p>
      <p><label>Fin <input type="datetime-local" name="end" defaultValue={initial.end} required /></label></p>
      <details><summary>Avancé : fuseau horaire et heure ambiguë</summary>
        <p><label>Fuseau horaire <input name="timeZone" defaultValue={initial.timeZone} required list="timezones" /></label></p>
        <p className="field-help">À renseigner seulement si l’heure tombe sur un changement d’heure : indique les dates avec leur décalage UTC, par exemple 2026-10-25T02:30:00+02:00.</p>
        <OffsetFields />
      </details>
    </>}
  </fieldset>;
}
function OffsetFields() {
  return <><p><label>Début avec décalage <input name="startOffset" placeholder="2026-10-25T02:30:00+02:00" /></label></p><p><label>Fin avec décalage <input name="endOffset" /></label></p></>;
}
export function ZoneInput({ initial }: { initial: string }) {
  const [zone, setZone] = useState(initial);
  return <><label>Fuseau horaire <input name="timeZone" value={zone} onChange={e => setZone(e.target.value)} required list="timezones" /></label>{" "}<button type="button" onClick={() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris")}>Utiliser le fuseau de cet appareil</button></>;
}
