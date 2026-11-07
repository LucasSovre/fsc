import { auth, productionReady } from "../../../../server/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function handle(request: Request) { productionReady(); return auth.handler(request); }
export const GET = handle;
export const POST = handle;
