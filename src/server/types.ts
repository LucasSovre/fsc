export type Calendar = { id: string; kind: "solo" | "common"; ownerId: string | null; catalogId: string };
export type Profile = {
  userId: string; calendarId: string; catalogId: string; timeZone: string;
  reminderMinutes: number; reminderMode: "all" | "tags"; selectedTags: string[];
  emailEnabled: boolean; pushEnabled: boolean;
};
export type Event = {
  id: string; calendarId: string; creatorId: string; title: string; description: string; location: string;
  allDay: boolean; startsAt: Date | null; endsAt: Date | null; startDate: string | null; endDate: string | null;
  timeZone: string; tags: string[]; version: number; createdAt: Date; updatedAt: Date;
  visibility: "solo" | "common";
};
export type Tag = { key: string; label: string };
