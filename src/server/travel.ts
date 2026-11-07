import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { account } from "./calendar";
import { rows, transaction } from "./database";
import { dateValue, DomainError } from "./validation";

export type TravelDay = { userId: string; day: string; name: string };
const rangeSchema = z.object({
  startDate: z.string().length(10).transform(dateValue),
  endDate: z.string().length(10).transform(dateValue),
}).strict();

export function travelRange(raw: unknown) {
  const range = rangeSchema.parse(raw);
  const start = Temporal.PlainDate.from(range.startDate), end = Temporal.PlainDate.from(range.endDate);
  const days = start.until(end).days;
  if (days < 0) throw new DomainError("La fin doit être égale ou postérieure au début.");
  if (days >= 366) throw new DomainError("Choisis une période de 366 jours maximum.");
  return { ...range, days: Array.from({ length: days + 1 }, (_, index) => start.add({ days: index }).toString()) };
}

export async function setTravelDays(userId: string, raw: unknown, marked: boolean) {
  const { startDate, endDate, days } = travelRange(raw);
  z.boolean().parse(marked);
  return transaction(async db => {
    await account(db, userId);
    if (marked) {
      await db.query(`INSERT INTO "travelDay"(id,"userId",day)
        SELECT gen_random_uuid()::text,$1,day FROM unnest($2::text[]) AS day
        ON CONFLICT("userId",day) DO NOTHING`, [userId, days]);
    } else {
      await db.query('DELETE FROM "travelDay" WHERE "userId"=$1 AND day >= $2 AND day <= $3', [userId, startDate, endDate]);
    }
  });
}

export async function listTravelDays(userId: string, raw: unknown): Promise<TravelDay[]> {
  const { startDate, endDate } = travelRange(raw);
  return transaction(async db => {
    await account(db, userId);
    return rows<TravelDay>(`SELECT t."userId",t.day,u.name FROM "travelDay" t JOIN "user" u ON u.id=t."userId"
      WHERE t.day >= $2 AND t.day <= $3 AND (t."userId"=$1 OR EXISTS(
        SELECT 1 FROM member self JOIN member partner ON partner."calendarId"=self."calendarId"
        WHERE self."userId"=$1 AND partner."userId"=t."userId"))
      ORDER BY t.day,u.name,t."userId"`, [userId, startDate, endDate], db);
  });
}
