"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <><h1>Impossible d’afficher cette page</h1><p>Réessaie dans un instant.</p><button onClick={reset}>Réessayer</button></>; }
