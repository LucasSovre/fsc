"use client";
import { useState } from "react";
import { subscribePushAction, unsubscribePushAction } from "../actions";
export function PushSettings({ publicKey }: { publicKey: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function enable() {
    setPending(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Ce navigateur ne propose pas les notifications web. Sur iPhone, ajoute FSC à l’écran d’accueil puis ouvre l’application depuis son icône.");
      if (!publicKey) throw new Error("Les notifications web ne sont pas encore configurées sur cette instance.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Autorisation refusée. Tu peux modifier ce choix dans les réglages de ton navigateur.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      const result = await subscribePushAction(subscription.toJSON());
      setMessage(result.error || result.message || "Appareil enregistré.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impossible d’activer les notifications."); }
    finally { setPending(false); }
  }
  async function disable() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) { await unsubscribePushAction(subscription.endpoint); await subscription.unsubscribe(); }
      setMessage("Notifications désactivées sur cet appareil.");
    } catch { setMessage("Impossible de désactiver les notifications."); }
    finally { setPending(false); }
  }
  return <section><h2>Notifications sur cet appareil</h2>
    <p>Sur iPhone (iOS 16.4 ou plus récent) : ouvre FSC dans Safari, touche Partager puis Ajouter à l’écran d’accueil. Ouvre FSC depuis son icône et active les notifications ici.</p>
    <p><button type="button" disabled={pending} onClick={enable}>Activer sur cet appareil</button>{" "}<button type="button" disabled={pending} onClick={disable}>Désactiver sur cet appareil</button></p>
    <p>Après activation, coche le canal Notifications web dans les préférences de rappel ci-dessus et enregistre.</p><p role="status">{message}</p>
  </section>;
}
