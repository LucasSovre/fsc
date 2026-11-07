import { session } from "../../../server/session";
import { feedEvents } from "../../../server/calendar";
import { calendarICS } from "../../../server/ics";
import { DomainError } from "../../../server/validation";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ calendar: string }> }) {
  const current = await session();
  if (!current?.user.emailVerified) return new Response("Connexion requise.", { status: 401, headers: { "Cache-Control": "no-store" } });
  const calendarId = (await params).calendar.replace(/\.ics$/, "");
  try {
    const data = await feedEvents(current.user.id, calendarId);
    return new Response(calendarICS(data.calendar, data.events), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="fsc-${data.calendar.kind}.ics"`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { if (error instanceof DomainError) return new Response("Calendrier introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } }); throw error; }
}
