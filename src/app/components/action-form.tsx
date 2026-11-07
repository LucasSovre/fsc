"use client";
import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "../actions";

export function ActionForm({ action, children }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; children: ReactNode }) {
  const [state, submit, pending] = useActionState(action, {});
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null), alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) { alert.current?.focus(); alert.current?.scrollIntoView({ block: "center" }); return; }
    if (state.redirectTo) router.push(state.redirectTo);
    else if (state.refresh) router.refresh();
    if (state.message || state.redirectTo || state.refresh) form.current?.reset();
  }, [state, router]);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => submit(data));
  }
  return <form ref={form} onSubmit={onSubmit} aria-busy={pending}>
    {state.error && <p role="alert" tabIndex={-1} ref={alert}>{state.error}</p>}
    <fieldset disabled={pending}>{children}</fieldset>
    <div aria-live="polite">
      {pending && <p>En cours…</p>}
      {state.message && <p>{state.message}</p>}
      {state.href && <><p><a href={state.href}>Ouvrir le lien</a></p><p><label>Adresse à copier <input readOnly value={state.href} /></label></p></>}
    </div>
  </form>;
}
