"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "./auth-client";
import { unsubscribePushAction } from "../actions";
export function Logout() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return <><button disabled={pending} onClick={async () => {
    setPending(true);
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) { await unsubscribePushAction(subscription.endpoint); await subscription.unsubscribe(); }
      }
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      router.replace("/connexion"); router.refresh();
    } catch { setError("Impossible de se déconnecter. Réessaie."); setPending(false); }
  }}>Se déconnecter</button>{error && <p role="alert">{error}</p>}</>;
}
