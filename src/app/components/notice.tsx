const messages: Record<string, string> = { enregistre: "Événement enregistré.", supprime: "Événement supprimé.", ajoutee: "Tâche ajoutée.", rejoint: "Tu as rejoint le calendrier commun." };
export function Notice({ code }: { code?: string }) {
  return code && messages[code] ? <p role="status" className="notice">{messages[code]}</p> : null;
}
