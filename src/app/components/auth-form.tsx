"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "./auth-client";
import { useHydrated } from "./use-hydrated";

const authErrors: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Adresse e-mail ou mot de passe incorrect.",
  EMAIL_NOT_VERIFIED: "Vérifie d’abord ton adresse avec le lien reçu par e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse.",
  INVALID_TOKEN: "Ce lien est invalide ou a expiré. Demande un nouveau lien.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 12 caractères.",
  TOO_MANY_REQUESTS: "Trop de tentatives. Réessaie dans quelques minutes.",
};

export function AuthForm({ mode }: { mode: "connexion" | "oubli" | "nouveau" }) {
  const [message, setMessage] = useState(""), [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const ready = useHydrated();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPending(true); setMessage(""); setFailed(false);
    const form = new FormData(e.currentTarget), email = String(form.get("email") || ""), password = String(form.get("password") || "");
    try {
      document.cookie = `fsc_timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris")}; Path=/; SameSite=Lax; Max-Age=31536000${window.location.protocol === "https:" ? "; Secure" : ""}`;
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("retour") || "/";
      const callbackURL = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
      const result = mode === "connexion" ? await authClient.signIn.email({ email, password, callbackURL })
        : mode === "oubli" ? await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/nouveau-mot-de-passe` })
        : await authClient.resetPassword({ newPassword: password, token: params.get("token") || "" });
      if (result.error) { setFailed(true); setMessage(authErrors[result.error.code || ""] || "Impossible de terminer cette demande. Vérifie les informations ou réessaie dans un instant."); }
      else if (mode === "connexion") window.location.assign(result.data && "url" in result.data && typeof result.data.url === "string" ? result.data.url : callbackURL);
      else if (mode === "oubli") setMessage("Si ce compte existe, un lien de réinitialisation a été envoyé.");
      else setMessage("Mot de passe enregistré. Tu peux te connecter.");
    } catch { setFailed(true); setMessage("Connexion impossible. Réessaie dans un instant."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}>
    <fieldset disabled={pending || !ready}>
      <legend>{mode === "connexion" ? "Se connecter" : mode === "oubli" ? "Recevoir un lien" : "Nouveau mot de passe"}</legend>
      {mode !== "nouveau" && <p><label>E-mail <input type="email" name="email" autoComplete="email" required maxLength={254} /></label></p>}
      {mode !== "oubli" && <p><label>Mot de passe <input type="password" name="password" required minLength={mode === "connexion" ? 1 : 12} autoComplete={mode === "connexion" ? "current-password" : "new-password"} /></label></p>}
      {mode !== "connexion" && mode !== "oubli" && <p>Au moins 12 caractères.</p>}
      <button type="submit">{pending ? "En cours…" : mode === "connexion" ? "Se connecter" : "Envoyer"}</button>
    </fieldset>
    <p role="status">{failed ? "" : message}</p>{failed && <p role="alert">{message}</p>}
  </form>;
}
