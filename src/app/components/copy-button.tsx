"use client";
import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return <>
    <button type="button" className="button-secondary" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setStatus("copied"); } catch { setStatus("failed"); }
    }}>Copier l’adresse</button>
    <span role="status" className="field-help">{status === "copied" ? " Copié." : status === "failed" ? " Copie impossible : sélectionne l’adresse à la main." : ""}</span>
  </>;
}
