import { describe, expect, test } from "bun:test";
import { dateValue, eventDates, eventSchema, instant, tagKey } from "../src/server/validation";
import { reminderPlan } from "../src/server/reminder-plan";
import { calendarICS } from "../src/server/ics";
import type { Event, Profile } from "../src/server/types";

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
  test("ICS : UID stable, fin exclusive, texte échappé", () => {
    const data = calendarICS({ id: "c", kind: "solo", ownerId: "u", catalogId: "t" }, [{ ...event, allDay: true, startDate: "2027-01-01", endDate: "2027-01-03" }]);
    expect(data).toContain("UID:test@fsc");
    expect(data).toContain("DTSTART;VALUE=DATE:20270101");
    expect(data).toContain("DTEND;VALUE=DATE:20270103");
    expect(data.match(/\r\nBEGIN:VEVENT/g)?.length).toBe(1);
    expect(data).toContain("SEQUENCE:2");
  });
});
