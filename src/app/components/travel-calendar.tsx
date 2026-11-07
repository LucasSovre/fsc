"use client";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ActionForm } from "./action-form";
import { travelAction } from "../actions";

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("fsc-travel-view", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("fsc-travel-view", notify);
  };
}

export function TravelCalendar({ userId, menu, children }: { userId: string; menu: ReactNode; children: ReactNode }) {
  const key = `fsc:travel-view:${userId}`;
  const [fallback, setFallback] = useState<boolean | null>(null);
  const visible = useSyncExternalStore(subscribe, () => {
    if (fallback !== null) return fallback;
    try { return localStorage.getItem(key) === "true"; } catch { return false; }
  }, () => false);
  return <div className="travel-calendar" data-show-travel={visible}>
    {visible && <p className="travel-legend"><span aria-hidden="true" /> Fond pêche : en déplacement</p>}
    {children}
    <details className="travel-menu"><summary>Déplacements</summary>
    <label className="travel-toggle"><input type="checkbox" role="switch" checked={visible} onChange={event => {
      const value = event.target.checked;
      try { localStorage.setItem(key, String(value)); setFallback(null); }
      catch { setFallback(value); }
      window.dispatchEvent(new Event("fsc-travel-view"));
    }} /> Afficher les déplacements</label>
      {menu}
    </details>
  </div>;
}

export function TravelForm({ day }: { day: string }) {
  return <div className="travel-form">
    <p><strong>Marquer des jours de déplacement</strong></p>
    <p className="field-help">Tes déplacements sont visibles par ton partenaire dans FSC uniquement, sans export ICS ni rappel.</p>
    <ActionForm key={day} action={travelAction}>
      <label>Du <input type="date" name="startDate" defaultValue={day} required /></label>
      <label>Au (inclus) <input type="date" name="endDate" defaultValue={day} required /></label>
      <p className="field-help">Pour un seul jour, choisis la même date. Maximum : 366 jours.</p>
      <div className="travel-actions">
        <button type="submit" name="operation" value="mark">Marquer mes jours</button>
        <button type="submit" name="operation" value="remove">Retirer mon marquage</button>
      </div>
    </ActionForm>
  </div>;
}
