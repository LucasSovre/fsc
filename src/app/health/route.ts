import { pool } from "../../server/database";
import { productionReady } from "../../server/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try { productionReady(); await pool.query("SELECT id FROM calendar LIMIT 1"); return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
