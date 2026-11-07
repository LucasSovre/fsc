import { createInvitation } from "./calendar";
import { sendMail } from "./mail";

export async function inviteByMail(userId: string, email: string) {
  const invitation = await createInvitation(userId, email);
  try {
    await sendMail(invitation.email, "FSC — invitation à partager un calendrier", `Rejoins notre calendrier commun : ${invitation.url}\nCe lien est valable sept jours et réservé à ${invitation.email}.`);
    return { ...invitation, mailed: true };
  } catch { return { ...invitation, mailed: false }; }
}
