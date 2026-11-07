import { z } from "zod";
import { addAndSyncLinkedCalendar, listLinkedCalendars, removeLinkedCalendar, setLinkedCalendarEnabled, syncLinkedCalendar } from "../linked-calendars";
import { listTravelDays, setTravelDays } from "../travel";
import { idSchema } from "../validation";
import { confirm, type ToolContext } from "./context";

const period = z.object({ startDate: z.string().length(10), endDate: z.string().length(10) });

export function registerLinkedTools({ server, userId, invoke }: ToolContext) {
  server.registerTool("list_linked_calendars", { description: "Lister les calendriers liés (abonnements ICS importés) avec leur état de synchronisation.", inputSchema: z.object({}) },
    async () => invoke("calendar:read", () => listLinkedCalendars(userId)));
  server.registerTool("add_linked_calendar", {
    description: "Lier un calendrier ICS public en HTTPS puis le synchroniser. visibility (solo ou common) est obligatoire : demander à l’utilisateur. Les événements importés ne sont pas modifiables.",
    inputSchema: z.object({ name: z.string().max(200), url: z.string().max(2048), visibility: z.enum(["solo", "common"]) }),
  }, async input => invoke("linked:write", () => addAndSyncLinkedCalendar(userId, input)));
  server.registerTool("refresh_linked_calendar", { description: "Actualiser un calendrier lié maintenant.", inputSchema: z.object({ id: idSchema }) },
    async ({ id }) => invoke("linked:write", async () => ({ refreshed: await syncLinkedCalendar(id, undefined, new Date(), userId) })));
  server.registerTool("set_linked_calendar_enabled", { description: "Mettre un calendrier lié en pause (enabled false) ou reprendre sa synchronisation.", inputSchema: z.object({ id: idSchema, enabled: z.boolean() }) },
    async ({ id, enabled }) => invoke("linked:write", async () => { await setLinkedCalendarEnabled(userId, id, enabled); return { enabled }; }));
  server.registerTool("remove_linked_calendar", {
    description: "Supprimer un calendrier lié et tous ses événements importés. Action destructive : demander confirmation, puis confirm à true.",
    inputSchema: z.object({ id: idSchema, confirm }),
  }, async ({ id }) => invoke("linked:write", async () => { await removeLinkedCalendar(userId, id); return { removed: true }; }));
  server.registerTool("list_travel_days", {
    description: "Lister les jours de déplacement de l’utilisateur et de son partenaire sur une période (dates AAAA-MM-JJ inclusives, 366 jours maximum).",
    inputSchema: period,
  }, async input => invoke("calendar:read", () => listTravelDays(userId, input)));
  server.registerTool("set_travel_days", {
    description: "Marquer (marked true) ou retirer (false) ses propres jours de déplacement sur une période inclusive de 366 jours maximum.",
    inputSchema: period.extend({ marked: z.boolean() }),
  }, async ({ marked, ...input }) => invoke("travel:write", async () => { await setTravelDays(userId, input, marked); return { marked }; }));
}
