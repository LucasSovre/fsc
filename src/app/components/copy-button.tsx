"use client";
import { useState } from "react";

export function CopyButton({ value, label = "Copier l’adresse" }: { value: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return <>
    <button type="button" className="button-secondary" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setStatus("copied"); } catch { setStatus("failed"); }
    }}>{label}</button>
    <span role="status" className="field-help">{status === "copied" ? " Copié." : status === "failed" ? " Copie impossible : sélectionne l’adresse à la main." : ""}</span>
  </>;
}
