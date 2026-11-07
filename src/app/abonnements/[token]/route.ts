import { rows } from "../../../server/database";
import { feedEvents, tokenHash } from "../../../server/calendar";
import { calendarICS } from "../../../server/ics";
import { DomainError } from "../../../server/validation";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  if (!/^[\w-]{43}$/.test(token)) return new Response("Abonnement introuvable.", { status: 404 });
  const [feed] = await rows<{ userId: string; calendarId: string }>('SELECT "userId","calendarId" FROM feed WHERE "tokenHash"=$1', [tokenHash(token)]);
  if (!feed) return new Response("Abonnement introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const data = await feedEvents(feed.userId, feed.calendarId, token);
    return new Response(calendarICS(data.calendar, data.events), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { if (error instanceof DomainError) return new Response("Abonnement introuvable.", { status: 404 }); throw error; }
}
