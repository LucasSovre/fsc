import { rows } from "./database";
import { sendMail } from "./mail";
import { baseURL } from "./config";
import { isMailConfigured } from "./smtp";
import type { Event, Todo } from "./types";

async function partner(calendarId: string, creatorId: string) {
  const [row] = await rows<{ email: string; creator: string }>(
    `SELECT u.email,(SELECT name FROM "user" WHERE id=$2) AS creator FROM "user" u JOIN member m ON m."userId"=u.id
     WHERE m."calendarId"=$1 AND u.id<>$2 LIMIT 1`, [calendarId, creatorId]);
  return row;
}
const dateText = (event: Event) => event.allDay
  ? `${event.startDate}${event.endDate && event.endDate !== event.startDate ? ` → ${event.endDate}` : ""}`
  : new Date(event.startsAt!).toLocaleString("fr-FR", { timeZone: event.timeZone || "Europe/Paris", dateStyle: "full", timeStyle: "short" });

async function notify(calendarId: string, creatorId: string, subject: (creator: string) => string, body: string, path: string) {
  try {
    if (!(await isMailConfigured())) return;
    const to = await partner(calendarId, creatorId);
    if (!to) return;
    await sendMail(to.email, subject(to.creator), `${body}\n\nOuvrir : ${baseURL}${path}`);
  } catch (error) { console.error("Notification de partage non envoyée", error); }
}
export async function notifyTodoShared(todo: Todo) {
  if (todo.visibility !== "common") return;
  const due = todo.dueDate ? `\nÉchéance : ${todo.dueDate}` : "";
  await notify(todo.calendarId, todo.creatorId, creator => `FSC — ${creator} a créé une tâche commune`, `Nouvelle tâche commune : ${todo.title}${due}`, "/todo");
}
export async function notifyEventShared(event: Event) {
  if (event.visibility !== "common") return;
  const lines = [`Nouvel événement commun : ${event.title}`, `Quand : ${dateText(event)}`, event.location && `Lieu : ${event.location}`, event.description && `\n${event.description}`];
  await notify(event.calendarId, event.creatorId, creator => `FSC — ${creator} a créé un événement commun`, lines.filter(Boolean).join("\n"), "/");
}
