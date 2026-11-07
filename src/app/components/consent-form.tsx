"use client";
import { useState } from "react";
import { authClient } from "./auth-client";
import { useHydrated } from "./use-hydrated";
export function ConsentForm() {
  const [error, setError] = useState(""), [pending, setPending] = useState(false);
  const ready = useHydrated();
  async function consent(accept: boolean) {
    setPending(true); setError("");
    try {
      const result = await authClient.oauth2.consent({ accept });
      if (result.error) { setError("Autorisation impossible. Réessaie depuis Claude."); setPending(false); }
      else if (result.data?.url) window.location.assign(result.data.url);
    } catch { setError("Autorisation impossible. Réessaie depuis Claude."); setPending(false); }
  }
  return <><button disabled={pending || !ready} onClick={() => consent(true)}>Autoriser</button>{" "}<button disabled={pending || !ready} onClick={() => consent(false)}>Refuser</button>{error && <p role="alert">{error}</p>}</>;
}
