import { describe, expect, test } from "bun:test";
import { dateValue, eventDates, eventReminderSchema, eventSchema, instant, smtpSchema, tagKey, todoSchema } from "../src/server/validation";
import { decryptSecret, encryptSecret } from "../src/server/secret";
import { reminderPlan } from "../src/server/reminder-plan";
import { calendarICS } from "../src/server/ics";
import type { Event, Profile } from "../src/server/types";
import { databaseUrl } from "../src/server/database-url";
import { assertPublicURL } from "../src/server/config";
import { todoDigestDay, todoDigestText } from "../src/server/todo-mail";
import type { Todo } from "../src/server/types";
import { parseCalendarSource } from "../src/server/calendar-parser";
import { calendarSourceURL, decryptCalendarURL, encryptCalendarURL, isPublicCalendarAddress } from "../src/server/calendar-source";

const ics = (...events: string[]) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FSC tests//FR\r\n${events.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
const vevent = (...properties: string[]) => `BEGIN:VEVENT\r\n${properties.join("\r\n")}\r\nEND:VEVENT`;
const sourcePeriod = { timeZone: "Europe/Paris", from: "2027-01-01", to: "2027-12-31" };
describe("Calendriers liés : lecture ICS et sécurité du lien", () => {
  test("UTC, durée, journée entière sans fin, texte plié et catégories", () => {
    const events = parseCalendarSource(ics(
      vevent("UID:utc", "DTSTART:20270310T090000Z", "DURATION:PT90M", "SUMMARY:Réunion très", " longue", "DESCRIPTION:Texte\\nLigne suivante", "CATEGORIES:Travail,Famille"),
      vevent("UID:day", "DTSTART;VALUE=DATE:20270311", "SUMMARY:Journée entière"),
    ), sourcePeriod);
    expect(events).toHaveLength(2);
    const timed = events.find(event => event.input.title === "Réunion trèslongue")!;
    expect(timed.input.temporalData).toMatchObject({ start: "2027-03-10T09:00:00.000Z", end: "2027-03-10T10:30:00.000Z" });
    expect(timed.input.description).toBe("Texte\nLigne suivante");
    expect(timed.input.tags).toEqual(["Travail", "Famille"]);
    expect(events.find(event => event.input.title === "Journée entière")!.input.temporalData).toEqual({ allDay: true, startDate: "2027-03-11", endDate: "2027-03-12" });
  });
  test("fuseau IANA sans VTIMEZONE, récurrences, exceptions et passage à l’heure d’été", () => {
    const data = ics(
      vevent("UID:series", "DTSTART;TZID=Europe/Paris:20270327T090000", "DTEND;TZID=Europe/Paris:20270327T100000", "SUMMARY:Habitude", "RRULE:FREQ=DAILY;COUNT=4", "EXDATE;TZID=Europe/Paris:20270328T090000"),
      vevent("UID:series", "RECURRENCE-ID;TZID=Europe/Paris:20270329T090000", "DTSTART;TZID=Europe/Paris:20270329T110000", "DTEND;TZID=Europe/Paris:20270329T120000", "SUMMARY:Déplacée"),
      vevent("UID:series", "RECURRENCE-ID;TZID=Europe/Paris:20270330T090000", "STATUS:CANCELLED"),
      vevent("UID:other", "DTSTART:20270329T090000Z", "DTEND:20270329T100000Z", "SUMMARY:Autre série"),
    );
    const events = parseCalendarSource(data, sourcePeriod);
    expect(events).toHaveLength(3);
    expect(events.find(event => event.input.title === "Habitude")!.input.temporalData).toMatchObject({ start: "2027-03-27T08:00:00.000Z", timeZone: "Europe/Paris" });
    expect(events.find(event => event.input.title === "Déplacée")!.input.temporalData).toMatchObject({ start: "2027-03-29T09:00:00.000Z", end: "2027-03-29T10:00:00.000Z" });
    const shifted = parseCalendarSource(ics(vevent("UID:dst", "DTSTART;TZID=Europe/Paris:20270327T090000", "DTEND;TZID=Europe/Paris:20270327T100000", "RRULE:FREQ=DAILY;COUNT=2")), sourcePeriod);
    expect(shifted[1].input.temporalData).toMatchObject({ start: "2027-03-28T07:00:00.000Z" });
  });
  test("fuseau défini dans le fichier et dates flottantes", () => {
    const timezone = "BEGIN:VTIMEZONE\r\nTZID:Custom/FSC\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0200\r\nEND:STANDARD\r\nEND:VTIMEZONE";
    const events = parseCalendarSource(ics(timezone,
      vevent("UID:custom-zone", "DTSTART;TZID=Custom/FSC:20270310T090000", "DTEND;TZID=Custom/FSC:20270310T100000"),
      vevent("UID:floating", "DTSTART:20270310T090000", "DTEND:20270310T100000"),
    ), sourcePeriod);
    expect(events[0].input.temporalData).toMatchObject({ start: "2027-03-10T07:00:00.000Z", timeZone: "UTC" });
    expect(events[1].input.temporalData).toMatchObject({ start: "2027-03-10T08:00:00.000Z", timeZone: "Europe/Paris" });
  });
  test("révisions et identifiants stables, période et annulations", () => {
    const data = ics(
      vevent("UID:same", "SEQUENCE:0", "DTSTART:20270310T090000Z", "DTEND:20270310T100000Z", "SUMMARY:Ancien"),
      vevent("UID:same", "SEQUENCE:1", "DTSTART:20270310T110000Z", "DTEND:20270310T120000Z", "SUMMARY:Nouveau"),
      vevent("UID:past", "DTSTART;VALUE=DATE:20200101"),
      vevent("UID:cancelled", "STATUS:CANCELLED"),
    );
    const events = parseCalendarSource(data, sourcePeriod);
    expect(events).toHaveLength(1);
    expect(events[0].input.title).toBe("Nouveau");
    expect(parseCalendarSource(data.replace("Nouveau", "Encore modifié"), sourcePeriod)[0].key).toBe(events[0].key);
    expect(parseCalendarSource(ics(), sourcePeriod)).toEqual([]);
    expect(() => parseCalendarSource(ics().replace("VERSION:2.0", "VERSION:2.0\r\nMETHOD:REQUEST"), sourcePeriod)).toThrow();
  });
  test("fichier invalide, UID absent, dates invalides et récurrence trop fréquente refusés", () => {
    for (const data of ["<html>Connexion requise</html>", ics(vevent("DTSTART;VALUE=DATE:20270101")), ics(vevent("UID:bad", "DTSTART;VALUE=DATE:20270230")), ics(vevent("UID:bad", "DTSTART:20270101T090000Z", "DTEND:20270101T100000Z", "RRULE:FREQ=SECONDLY")), ics(vevent("UID:bad", "DTSTART;TZID=Unknown/Zone:20270101T090000", "DTEND;TZID=Unknown/Zone:20270101T100000"))])
      expect(() => parseCalendarSource(data, sourcePeriod)).toThrow();
  });
  test("HTTPS/webcal publics uniquement, IPv4/IPv6 privées bloquées", () => {
    expect(calendarSourceURL("webcal://calendar.example/feed.ics?secret=abc").protocol).toBe("https:");
    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2002:7f00:1::", "2001:db8::1"]) expect(isPublicCalendarAddress(address)).toBe(false);
    expect(isPublicCalendarAddress("8.8.8.8")).toBe(true);
    expect(isPublicCalendarAddress("2606:4700:4700::1111")).toBe(true);
    for (const url of ["http://calendar.example/feed.ics", "https://127.0.0.1/feed", "https://[::1]/feed", "https://2130706433/feed", "https://name:password@calendar.example/feed", "https://calendar.example:8443/feed"]) expect(() => calendarSourceURL(url)).toThrow();
  });
  test("le lien secret est chiffré et une altération est refusée", () => {
    const previous = process.env.BETTER_AUTH_SECRET;
    try {
      process.env.BETTER_AUTH_SECRET = "test-calendar-encryption-key-at-least-32";
      const url = "https://calendar.example/feed.ics?secret=hidden", encrypted = encryptCalendarURL(url);
      expect(encrypted).not.toContain("hidden");
      expect(decryptCalendarURL(encrypted)).toBe(url);
      const changed = Buffer.from(encrypted, "base64url"); changed[changed.length - 1] ^= 1;
      expect(() => decryptCalendarURL(changed.toString("base64url"))).toThrow();
    } finally { process.env.BETTER_AUTH_SECRET = previous; }
  });
});

describe("Todo et récapitulatif quotidien", () => {
  test("titre, visibilité et échéance facultative valides", () => {
    expect(todoSchema.parse({ title: "  Acheter du pain  ", visibility: "solo", dueDate: "" }).dueDate).toBeNull();
    expect(todoSchema.parse({ title: "  Acheter du pain  ", visibility: "solo", dueDate: null }).title).toBe("Acheter du pain");
    for (const dueDate of ["2027-02-29", "hier", "2027-2-01"]) expect(() => todoSchema.parse({ title: "Tâche", visibility: "solo", dueDate })).toThrow();
    expect(todoSchema.safeParse({ title: " ", visibility: "solo", dueDate: null }).success).toBe(false);
    expect(todoSchema.safeParse({ title: "Tâche", dueDate: null }).success).toBe(false);
  });
  test("9 h locales : changement d’heure et dates locales", () => {
    expect(todoDigestDay(new Date("2027-03-28T06:59:00Z"), "Europe/Paris")).toBeNull();
    expect(todoDigestDay(new Date("2027-03-28T07:00:00Z"), "Europe/Paris")).toBe("2027-03-28");
    expect(todoDigestDay(new Date("2027-01-02T13:59:00Z"), "America/New_York")).toBeNull();
    expect(todoDigestDay(new Date("2027-01-02T14:00:00Z"), "America/New_York")).toBe("2027-01-02");
    expect(todoDigestDay(new Date("2027-01-02T07:00:00Z"), "Pacific/Honolulu")).toBe("2027-01-01");
  });
  test("l’e-mail contient les échéances, la visibilité et un lien Todo", () => {
    const text = todoDigestText([{ title: "Ranger\nla cuisine", dueDate: "2027-01-01", visibility: "common" } as Todo], "https://fsc.example/todo");
    expect(text).toContain("Ranger la cuisine — échéance 2027-01-01 · Commun");
    expect(text).toContain("https://fsc.example/todo");
  });
});

describe("URL publique et Docker local", () => {
  test("autorise HTTP sur les adresses de boucle locale", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"])
      expect(() => assertPublicURL(`http://${host}:3000`)).not.toThrow();
  });
  test("conserve HTTPS pour les domaines publics", () => {
    expect(() => assertPublicURL("https://calendar.example.com")).not.toThrow();
    for (const url of ["http://calendar.example.com", "http://localhost.example.com", "ftp://localhost", "adresse-invalide"])
      expect(() => assertPublicURL(url)).toThrow();
  });
});

describe("connexion PostgreSQL", () => {
  test("construit l’URL avec les variables PostgreSQL et les valeurs locales par défaut", () => {
    expect(databaseUrl({ POSTGRES_PASSWORD: "secret" })).toBe("postgresql://fsc:secret@localhost:5432/fsc");
    expect(databaseUrl({ POSTGRES_USER: "alice", POSTGRES_PASSWORD: "secret", POSTGRES_DB: "calendar", POSTGRES_HOST: "db", POSTGRES_PORT: "5433" }))
      .toBe("postgresql://alice:secret@db:5433/calendar");
  });
  test("encode les caractères réservés du compte, du mot de passe et de la base", () => {
    const user = "couple@fsc", password = "p@ss:/?#%$", database = "fsc/test?";
    const url = new URL(databaseUrl({ POSTGRES_USER: user, POSTGRES_PASSWORD: password, POSTGRES_DB: database }));
    expect(decodeURIComponent(url.username)).toBe(user);
    expect(decodeURIComponent(url.password)).toBe(password);
    expect(decodeURIComponent(url.pathname.slice(1))).toBe(database);
    expect(url.hostname).toBe("localhost");
    expect(url.search).toBe(""); expect(url.hash).toBe("");
  });
  test("accepte une adresse IPv6 comme hôte", () => {
    expect(new URL(databaseUrl({ POSTGRES_HOST: "::1" })).hostname).toBe("[::1]");
  });
});

const profile = { timeZone: "Europe/Paris", reminderMinutes: 30, reminderMode: "tags", selectedTags: ["famille", "important"] } as Profile;
const event = { id: "test", title: "Dîner, ensemble;\nDemain", description: "Texte\nBEGIN:VEVENT", location: "Paris", allDay: false, startsAt: new Date("2027-01-01T18:00:00Z"), endsAt: new Date("2027-01-01T19:00:00Z"), tags: ["famille", "important"], version: 2, createdAt: new Date(), updatedAt: new Date() } as Event;
describe("validation et rappels", () => {
  test("visibilité obligatoire, titre et durée valides", () => {
    expect(eventSchema.safeParse({ title: "Dîner", temporalData: { allDay: true, startDate: "2027-01-01", endDate: "2027-01-02" } }).success).toBe(false);
    expect(() => eventDates({ allDay: true, startDate: "2027-01-01", endDate: "2027-01-01" }, "UTC")).toThrow();
    expect(() => dateValue("2027-02-29")).toThrow();
  });
  test("normalisation des tags sans doublon logique", () => {
    expect(tagKey("  FAMILLE   proche ")).toBe("famille proche");
    expect(tagKey("Été")).toBe(tagKey("E\u0301te\u0301"));
  });
  test("refuse les heures inexistantes et ambiguës, accepte un décalage explicite", () => {
    expect(() => instant("2027-03-28T02:30", "Europe/Paris")).toThrow();
    expect(() => instant("2027-10-31T02:30", "Europe/Paris")).toThrow();
    expect(instant("2027-10-31T02:30:00+02:00", "Europe/Paris").toISOString()).toBe("2027-10-31T00:30:00.000Z");
  });
  test("filtre OU, événements sans tag et sélection vide", () => {
    expect(reminderPlan(event, profile)?.dueAt.toISOString()).toBe("2027-01-01T17:30:00.000Z");
    expect(reminderPlan({ ...event, tags: ["important"] }, profile)).not.toBeNull();
    expect(reminderPlan({ ...event, tags: [] }, profile)).toBeNull();
    expect(reminderPlan(event, { ...profile, selectedTags: [] })).toBeNull();
    expect(reminderPlan({ ...event, tags: [] }, { ...profile, reminderMode: "all" })).not.toBeNull();
  });
  test("journée entière à 9h dans le fuseau individuel", () => {
    const whole = { ...event, allDay: true, startDate: "2027-07-01", endDate: "2027-07-02" };
    expect(reminderPlan(whole, profile)?.dueAt.toISOString()).toBe("2027-07-01T06:30:00.000Z");
    expect(reminderPlan(whole, { ...profile, timeZone: "America/New_York" })?.dueAt.toISOString()).toBe("2027-07-01T12:30:00.000Z");
  });
  test("rappel personnel : priorité sur les tags, désactivation et retour aux réglages", () => {
    const custom = { mode: "custom" as const, reminderMinutes: 60, emailEnabled: true, pushEnabled: false };
    const untagged = { ...event, tags: [] };
    const plan = reminderPlan(untagged, { ...profile, emailEnabled: false }, custom)!;
    expect(plan.dueAt.toISOString()).toBe("2027-01-01T17:00:00.000Z");
    expect(plan.emailEnabled).toBe(true);
    expect(plan.pushEnabled).toBe(false);
    expect(reminderPlan(event, profile, { mode: "off" })).toBeNull();
    expect(reminderPlan(untagged, profile, { mode: "inherit" })).toBeNull();
    expect(reminderPlan(event, profile, { mode: "inherit" })?.dueAt).toEqual(reminderPlan(event, profile)?.dueAt);
    expect(reminderPlan(event, profile, { ...custom, reminderMinutes: 0 })?.dueAt).toEqual(event.startsAt!);
    expect(reminderPlan({ ...event, allDay: true, startDate: "2027-07-01" }, profile, { ...custom, reminderMinutes: 1440 })?.dueAt.toISOString()).toBe("2027-06-30T07:00:00.000Z");
  });
  test("rappel personnalisé : délai borné et au moins un canal", () => {
    const custom = { mode: "custom", reminderMinutes: 30, emailEnabled: true, pushEnabled: false };
    expect(eventReminderSchema.safeParse(custom).success).toBe(true);
    for (const reminderMinutes of [-1, 0.5, 525601, NaN]) expect(eventReminderSchema.safeParse({ ...custom, reminderMinutes }).success).toBe(false);
    expect(eventReminderSchema.safeParse({ ...custom, emailEnabled: false }).success).toBe(false);
    expect(eventReminderSchema.safeParse({ mode: "off" }).success).toBe(true);
    expect(eventReminderSchema.safeParse({ mode: "inherit" }).success).toBe(true);
  });
  test("ICS : UID stable, fin exclusive, texte échappé", () => {
    const data = calendarICS({ id: "c", kind: "solo", ownerId: "u", catalogId: "t" }, [{ ...event, allDay: true, startDate: "2027-01-01", endDate: "2027-01-03" }]);
    expect(data).toContain("UID:test@fsc");
    expect(data).toContain("DTSTART;VALUE=DATE:20270101");
    expect(data).toContain("DTEND;VALUE=DATE:20270103");
    expect(data.match(/\r\nBEGIN:VEVENT/g)?.length).toBe(1);
    expect(data).toContain("SEQUENCE:2");
  });
});
describe("Configuration SMTP", () => {
  const valid = { host: "smtp.example.com", port: 587, secure: false, user: "", password: "", from: "FSC <fsc@example.com>" };
  test("accepte une configuration valide et applique les valeurs par défaut", () => {
    expect(smtpSchema.parse({ host: " smtp.example.com ", port: 465, secure: true, from: "fsc@example.com" })).toMatchObject({ host: "smtp.example.com", user: "", password: "" });
  });
  test("refuse hôte vide, port invalide et expéditeur vide", () => {
    expect(smtpSchema.safeParse({ ...valid, host: " " }).success).toBe(false);
    expect(smtpSchema.safeParse({ ...valid, port: 0 }).success).toBe(false);
    expect(smtpSchema.safeParse({ ...valid, port: 70000 }).success).toBe(false);
    expect(smtpSchema.safeParse({ ...valid, from: "" }).success).toBe(false);
  });
  test("chiffre le mot de passe de façon réversible", () => {
    process.env.BETTER_AUTH_SECRET = "x".repeat(40);
    const encrypted = encryptSecret("mot-de-passe-smtp");
    expect(encrypted).not.toContain("mot-de-passe-smtp");
    expect(decryptSecret(encrypted)).toBe("mot-de-passe-smtp");
  });
});
