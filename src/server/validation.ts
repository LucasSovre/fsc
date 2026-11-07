import { z } from "zod";
import { Temporal } from "temporal-polyfill";

export class DomainError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const idSchema = z.string().min(1).max(200);
export const zoneSchema = z.string().max(100).refine(zone => {
  try { new Intl.DateTimeFormat("fr", { timeZone: zone }); return true; } catch { return false; }
}, "Fuseau horaire invalide.");
export const temporalSchema = z.discriminatedUnion("allDay", [
  z.object({ allDay: z.literal(false), start: z.string().max(100), end: z.string().max(100), timeZone: zoneSchema }),
  z.object({ allDay: z.literal(true), startDate: z.string(), endDate: z.string() }),
]);
export const eventSchema = z.object({
  calendarId: idSchema.optional(),
  visibility: z.enum(["common", "solo"], { error: "Choisis Commun ou Solo." }),
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(300),
  description: z.string().max(10_000).default(""),
  location: z.string().max(500).default(""),
  type: z.enum(["spectacle", "sortie", "vacances", "visio", "travail"], { error: "Type d’événement inconnu." }).nullable().default(null),
  link: z.string().trim().max(2000).default("").refine(value => !value || /^https?:\/\/\S+$/i.test(value), "Le lien doit commencer par http:// ou https://."),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  temporalData: temporalSchema,
});
export type EventInput = z.input<typeof eventSchema>;
export const preferencesSchema = z.object({
  timeZone: zoneSchema,
  reminderMinutes: z.number().int().min(0).max(525600),
  reminderMode: z.enum(["all", "tags"]),
  selectedTags: z.array(z.string().trim().min(1).max(60)).max(200),
  emailEnabled: z.boolean(), pushEnabled: z.boolean(),
});
export const eventReminderSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("inherit") }),
  z.object({ mode: z.literal("off") }),
  z.object({
    mode: z.literal("custom"),
    reminderMinutes: z.number().int("Le délai doit être un nombre entier de minutes.").min(0).max(525600, "Le délai maximal est d’un an."),
    emailEnabled: z.boolean(),
    pushEnabled: z.boolean(),
  }).refine(value => value.emailEnabled || value.pushEnabled, "Choisis au moins un canal pour ton rappel personnalisé."),
]);
export const todoSchema = z.object({
  title: z.string().trim().min(1, "Le titre de la tâche est obligatoire.").max(300),
  visibility: z.enum(["solo", "common"], { error: "Choisis Commun ou Solo." }),
  dueDate: z.string().max(10).nullable().transform(value => value ? dateValue(value) : null),
});
export const tagKey = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
export const tagLabel = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ");
export function dateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DomainError("Date invalide.");
  try { return Temporal.PlainDate.from(value).toString(); } catch { throw new DomainError("Date invalide."); }
}
export function instant(value: string, zone: string) {
  try {
    return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)
      ? Temporal.Instant.from(value).epochMilliseconds
      : Temporal.PlainDateTime.from(value).toZonedDateTime(zone, { disambiguation: "reject" }).epochMilliseconds);
  } catch { throw new DomainError("Heure invalide, inexistante ou ambiguë. Pour une heure ambiguë, indique son décalage UTC (ex. +01:00)."); }
}
export function eventDates(input: z.output<typeof temporalSchema>, fallbackZone: string) {
  if (input.allDay) {
    const startDate = dateValue(input.startDate), endDate = dateValue(input.endDate);
    if (endDate <= startDate) throw new DomainError("La date de fin doit suivre le début (fin exclusive).");
    return { allDay: true, startsAt: null, endsAt: null, startDate, endDate, timeZone: fallbackZone };
  }
  const startsAt = instant(input.start, input.timeZone), endsAt = instant(input.end, input.timeZone);
  if (endsAt <= startsAt) throw new DomainError("La fin doit suivre le début.");
  return { allDay: false, startsAt, endsAt, startDate: null, endDate: null, timeZone: input.timeZone };
}
export function localDate(when: Date, zone: string) {
  return Temporal.Instant.from(when.toISOString()).toZonedDateTimeISO(zone).toPlainDate().toString();
}
export function dayInstant(date: string, zone: string, hour = 0) {
  return new Date(Temporal.PlainDate.from(date).toZonedDateTime({ timeZone: zone, plainTime: `${String(hour).padStart(2, "0")}:00` }).epochMilliseconds);
}
export function errorMessage(error: unknown) {
  if (error instanceof DomainError) return error.message;
  if (error instanceof z.ZodError) return error.issues.map(i => i.message).join(" ");
  return "Une erreur est survenue. Réessaie dans un instant.";
}
