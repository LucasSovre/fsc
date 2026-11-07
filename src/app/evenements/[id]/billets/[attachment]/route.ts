import { session } from "../../../../../server/session";
import { readAttachment } from "../../../../../server/attachments";
import { DomainError } from "../../../../../server/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string; attachment: string }> }) {
  const current = await session();
  if (!current?.user.emailVerified) return new Response("Connexion requise.", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id, attachment } = await params;
  try {
    const { attachment: file, data } = await readAttachment(current.user.id, id, attachment);
    const disposition = new URL(request.url).searchParams.has("telecharger") ? "attachment" : "inline";
    return new Response(new Uint8Array(data), { headers: {
      "Content-Type": file.mime, "Content-Length": String(data.length), "Cache-Control": "private, no-store",
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    } });
  } catch (error) { if (error instanceof DomainError) return new Response("Billet introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } }); throw error; }
}
