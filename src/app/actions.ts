"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "../server/session";
import { acceptInvitation, createInvitation, deleteEvent, leaveCalendar, revokeFeed, revokeInvitation, rotateFeed, saveEvent, savePreferences } from "../server/calendar";
import { errorMessage, DomainError } from "../server/validation";
import { sendMail } from "../server/mail";
import { addPushSubscription, removePushSubscription } from "../server/push";
import { revokeConnection } from "../server/oauth";

export type ActionState = { message?: string; error?: string; href?: string; redirectTo?: string; refresh?: boolean };
async function run(work: (userId: string) => Promise<ActionState>): Promise<ActionState> {
  const user = await requireUser();
  try {
    const result = await work(user.id);
    revalidatePath("/", "layout");
    return { refresh: true, ...result };
  } catch (error) { return { error: errorMessage(error) }; }
}
const text = (form: FormData, name: string) => String(form.get(name) ?? "");
const checked = (form: FormData, name: string) => form.get(name) === "on";
export async function eventAction(_: ActionState, form: FormData) {
  return run(async userId => {
    const allDay = checked(form, "allDay");
    const event = await saveEvent(userId, {
      visibility: text(form, "visibility"), title: text(form, "title"), description: text(form, "description"), location: text(form, "location"),
      tags: [...form.getAll("tags").map(String), ...text(form, "newTags").split(",").map(s => s.trim()).filter(Boolean)],
      temporalData: allDay ? { allDay: true, startDate: text(form, "startDate"), endDate: text(form, "endDate") }
        : { allDay: false, start: text(form, "startOffset").trim() || text(form, "start"), end: text(form, "endOffset").trim() || text(form, "end"), timeZone: text(form, "timeZone") },
    }, form.get("id") ? { id: text(form, "id"), version: Number(text(form, "version")), confirmVisibility: checked(form, "confirmVisibility") } : undefined);
    return { redirectTo: `/evenements/${event.id}` };
  });
}
export async function deleteEventAction(_: ActionState, form: FormData) {
  return run(async userId => {
    if (!checked(form, "confirm")) throw new DomainError("Confirme la suppression.");
    await deleteEvent(userId, text(form, "id"), Number(text(form, "version")));
    return { redirectTo: "/" };
  });
}
export async function preferencesAction(_: ActionState, form: FormData) {
  return run(async userId => {
    await savePreferences(userId, {
      timeZone: text(form, "timeZone"), reminderMinutes: Number(text(form, "reminderMinutes")),
      emailEnabled: checked(form, "emailEnabled"), pushEnabled: checked(form, "pushEnabled"),
      reminderMode: text(form, "reminderMode"), selectedTags: form.getAll("selectedTags").map(String),
    });
    return { message: "Réglages enregistrés." };
  });
}
export async function inviteAction(_: ActionState, form: FormData) {
  return run(async userId => {
    const invitation = await createInvitation(userId, text(form, "email"));
    try { await sendMail(invitation.email, "FSC — invitation à partager un calendrier", `Rejoins notre calendrier commun : ${invitation.url}\nCe lien est valable sept jours et réservé à ${invitation.email}.`); }
    catch { return { message: "Invitation créée. L’e-mail n’a pas pu être envoyé ; tu peux transmettre ce lien à la personne invitée.", href: invitation.url }; }
    return { message: "Invitation envoyée, valable sept jours.", href: invitation.url };
  });
}
export async function acceptInvitationAction(_: ActionState, form: FormData) {
  return run(async userId => { await acceptInvitation(userId, text(form, "token")); return { redirectTo: "/" }; });
}
export async function revokeInvitationAction(_: ActionState, form: FormData) {
  return run(async userId => { await revokeInvitation(userId, text(form, "id")); return { message: "Invitation révoquée." }; });
}
export async function leaveAction(_: ActionState, form: FormData) {
  return run(async userId => {
    if (!checked(form, "confirm")) throw new DomainError("Confirme ton départ.");
    await leaveCalendar(userId); return { message: "Tu as quitté le calendrier commun." };
  });
}
export async function feedAction(_: ActionState, form: FormData) {
  return run(async userId => {
    if (text(form, "operation") === "revoke") { await revokeFeed(userId, text(form, "calendarId")); return { message: "Abonnement révoqué." }; }
    return { message: "Copie et conserve cette adresse : elle ne sera affichée qu’ici. Un ancien lien pour cet agenda est désormais invalide.", href: await rotateFeed(userId, text(form, "calendarId")) };
  });
}
export async function subscribePushAction(raw: unknown) {
  return run(async userId => { await addPushSubscription(userId, raw); return { message: "Cet appareil est prêt à recevoir les notifications. Enregistre tes réglages pour activer le canal web." }; });
}
export async function unsubscribePushAction(endpoint: string) {
  return run(async userId => { await removePushSubscription(userId, z.string().max(4096).parse(endpoint)); return { message: "Notifications désactivées sur cet appareil." }; });
}
export async function revokeOAuthAction(_: ActionState, form: FormData) {
  return run(async userId => {
    await revokeConnection(userId, text(form, "clientId"));
    return { message: "Connexion révoquée. Une nouvelle autorisation sera nécessaire." };
  });
}
