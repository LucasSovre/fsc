import { z } from "zod";
import { deleteEvent, feedEvents, getEvent, getEventReminder, listCalendars, listEvents, saveEvent, saveEventReminder } from "../calendar";
import { calendarICS } from "../ics";
import { eventReminderSchema, eventSchema, idSchema } from "../validation";
import { confirm, version, type ToolContext } from "./context";

const eventFields = eventSchema.extend({ calendarId: idSchema, reminder: eventReminderSchema.optional() });
const eventView = (event: Awaited<ReturnType<typeof getEvent>>) => ({
  id: event.id, calendarId: event.calendarId, visibility: event.visibility, title: event.title, description: event.description, location: event.location,
  tags: event.tags, allDay: event.allDay, startsAt: event.startsAt, endsAt: event.endsAt, startDate: event.startDate, endDate: event.endDate,
  timeZone: event.timeZone, version: event.version, imported: Boolean(event.linkedCalendarId),
});

export function registerEventTools({ server, userId, invoke }: ToolContext) {
  server.registerTool("list_calendars", { description: "Lister les agendas accessibles (Commun ou Solo) avec leur identifiant.", inputSchema: z.object({}) }, async () => invoke("calendar:read", async () =>
    (await listCalendars(userId)).map(c => ({ id: c.id, name: c.kind === "common" ? "Commun" : "Solo", visibility: c.kind, canRead: true, canWrite: true }))));
  server.registerTool("list_events", {
    description: "Consulter les événements, y compris ceux des calendriers liés, sur une plage ISO 8601 avec décalage UTC (maximum 366 jours). calendarId est facultatif : sans lui, tous les agendas accessibles. Utiliser nextCursor pour la suite.",
    inputSchema: z.object({ calendarId: idSchema.optional(), from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }), cursor: z.string().max(20).optional(), limit: z.number().int().min(1).max(500).optional() }),
  }, async input => invoke("calendar:read", () => listEvents(userId, { ...input, from: new Date(input.from), to: new Date(input.to) })));
  server.registerTool("get_event", { description: "Lire un événement avec son rappel personnel.", inputSchema: z.object({ eventId: idSchema }) },
    async ({ eventId }) => invoke("calendar:read", async () => ({ event: eventView(await getEvent(userId, eventId)), reminder: await getEventReminder(userId, eventId) })));
  server.registerTool("create_event", {
    description: "Créer un événement. visibility est obligatoire : common ou solo ; si l’utilisateur ne l’a pas précisé, lui demander avant d’appeler cet outil. calendarId doit correspondre à cette visibilité. reminder règle ton rappel personnel (inherit, off ou custom). Fin de journée entière exclusive.",
    inputSchema: eventFields,
  }, async ({ reminder, ...input }) => invoke("event:write", () => saveEvent(userId, input, undefined, reminder)));
  server.registerTool("update_event", {
    description: "Modifier un événement créé par l’utilisateur (pas un événement importé). Passer la version lue par get_event ; un conflit de version signifie qu’il faut relire. Changer la visibilité exige confirmVisibility à true après accord de l’utilisateur. Tous les champs de l’événement sont à renvoyer.",
    inputSchema: eventFields.extend({ eventId: idSchema, version, confirmVisibility: z.boolean().optional() }),
  }, async ({ eventId, version: expected, confirmVisibility, reminder, ...input }) =>
    invoke("event:write", () => saveEvent(userId, input, { id: eventId, version: expected, confirmVisibility }, reminder)));
  server.registerTool("delete_event", {
    description: "Supprimer définitivement un événement. Action destructive : demander confirmation à l’utilisateur, puis confirm à true.",
    inputSchema: z.object({ eventId: idSchema, version, confirm }),
  }, async ({ eventId, version: expected }) => invoke("event:write", async () => { await deleteEvent(userId, eventId, expected); return { deleted: true }; }));
  server.registerTool("set_event_reminder", {
    description: "Régler ton rappel personnel pour un événement : inherit (réglages généraux), off, ou custom avec reminderMinutes et au moins un canal.",
    inputSchema: z.object({ eventId: idSchema, reminder: eventReminderSchema }),
  }, async ({ eventId, reminder }) => invoke("event:write", async () => { await saveEventReminder(userId, eventId, reminder); return reminder; }));
  server.registerTool("export_ics", {
    description: "Exporter un agenda au format iCalendar (.ics), renvoyé en texte.",
    inputSchema: z.object({ calendarId: idSchema }),
  }, async ({ calendarId }) => invoke("calendar:read", async () => {
    const data = await feedEvents(userId, calendarId);
    return { filename: `fsc-${data.calendar.kind}.ics`, ics: calendarICS(data.calendar, data.events) };
  }));
}
