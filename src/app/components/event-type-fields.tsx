"use client";
import { useState } from "react";
import type { EventAttachment, EventType } from "../../server/types";
import { typeEmojis, typeLabels, typesWithLink, typesWithTickets } from "./event-type";
const choices = Object.keys(typeLabels) as EventType[];
export function EventTypeFields({ eventId, initialType, link, attachments }: { eventId?: string; initialType: EventType | null; link: string; attachments: EventAttachment[] }) {
  const [type, setType] = useState<EventType | "">(initialType ?? "");
  const showLink = typesWithLink.includes(type) || !!link, showTickets = typesWithTickets.includes(type) || attachments.length > 0;
  return <>
    <fieldset className="type-field"><legend>Type (facultatif)</legend>
      <div className="type-options">
        <label className="type-option"><input type="radio" name="type" value="" checked={type === ""} onChange={() => setType("")} /><span>Aucun</span></label>
        {choices.map(value => <label className="type-option" key={value}><input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} /><span><span aria-hidden="true">{typeEmojis[value]}</span> {typeLabels[value]}</span></label>)}
      </div>
    </fieldset>
    {showLink && <p><label>{type === "visio" ? "Lien de la visio" : "Lien (réservation, programme…)"} <input name="link" type="url" inputMode="url" maxLength={2000} placeholder="https://" defaultValue={link} /></label></p>}
    {showTickets && <fieldset><legend>Billets et QR codes</legend>
      {attachments.map(file => <p key={file.id}><a href={`/evenements/${eventId}/billets/${file.id}`} target="_blank" rel="noopener noreferrer">{file.name}</a> <label><input type="checkbox" name="removeAttachment" value={file.id} /> Retirer</label></p>)}
      <p><label>Ajouter des fichiers (PDF, PNG, JPEG, WebP — 10 Mo max chacun) <input type="file" name="files" multiple accept="application/pdf,image/png,image/jpeg,image/webp" /></label></p>
    </fieldset>}
  </>;
}
