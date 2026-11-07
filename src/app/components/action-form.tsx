"use client";
import { useActionState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "../actions";

export function ActionForm({ action, children }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; children: ReactNode }) {
  const [state, submit, pending] = useActionState(action, {});
  const router = useRouter();
  useEffect(() => {
    if (state.redirectTo) router.push(state.redirectTo);
    else if (state.refresh) router.refresh();
  }, [state, router]);
  return <form action={submit} aria-busy={pending}>
    <fieldset disabled={pending}>{children}</fieldset>
    <div aria-live="polite">
      {pending && <p>En cours…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p>{state.message}</p>}
      {state.href && <><p><a href={state.href}>Ouvrir le lien</a></p><p><label>Adresse à copier <input readOnly value={state.href} /></label></p></>}
    </div>
  </form>;
}
