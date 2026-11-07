import { z } from "zod";
import { acceptInvitation, leaveCalendar, revokeFeed, revokeInvitation, rotateFeed, savePreferences, settings } from "../calendar";
import { inviteByMail } from "../invitation-mail";
import { listConnections, revokeConnection } from "../oauth";
import { idSchema, preferencesSchema } from "../validation";
import { confirm, type ToolContext } from "./context";

export function registerSettingsTools({ server, userId, invoke }: ToolContext) {
  server.registerTool("get_settings", {
    description: "Lire les réglages : fuseau, rappels, tags connus, calendriers, membres du Commun et invitations en attente.",
    inputSchema: z.object({}),
  }, async () => invoke("calendar:read", async () => {
    const { profile, calendars, tags, invitations, members } = await settings(userId);
    return {
      preferences: { timeZone: profile.timeZone, reminderMinutes: profile.reminderMinutes, reminderMode: profile.reminderMode, selectedTags: profile.selectedTags, emailEnabled: profile.emailEnabled, pushEnabled: profile.pushEnabled, todoEmailEnabled: profile.todoEmailEnabled },
      calendars: calendars.map(c => ({ id: c.id, name: c.kind === "common" ? "Commun" : "Solo", visibility: c.kind })),
      tags, members, invitations,
    };
  }));
  server.registerTool("save_preferences", {
    description: "Enregistrer les préférences de rappel : fuseau IANA, délai en minutes, mode all ou tags (avec selectedTags), canaux e-mail et push. Tous les champs sont à renvoyer ; partir de get_settings.",
    inputSchema: preferencesSchema,
  }, async input => invoke("settings:write", async () => { await savePreferences(userId, input); return input; }));
  server.registerTool("invite_partner", {
    description: "Inviter une personne par e-mail à partager le calendrier Commun (deux membres maximum, lien valable sept jours). Envoie un e-mail ; confirmer l’adresse avec l’utilisateur. Le lien renvoyé est secret.",
    inputSchema: z.object({ email: z.string().max(254) }),
  }, async ({ email }) => invoke("settings:write", async () => {
    const invitation = await inviteByMail(userId, email);
    return { email: invitation.email, url: invitation.url, mailed: invitation.mailed };
  }));
  server.registerTool("revoke_invitation", { description: "Révoquer une invitation en attente (identifiant dans get_settings).", inputSchema: z.object({ invitationId: idSchema }) },
    async ({ invitationId }) => invoke("settings:write", async () => { await revokeInvitation(userId, invitationId); return { revoked: true }; }));
  server.registerTool("accept_invitation", {
    description: "Accepter une invitation à rejoindre un calendrier Commun à partir du jeton de son lien (dernier segment de l’adresse /invitation/…).",
    inputSchema: z.object({ token: z.string().min(1).max(200) }),
  }, async ({ token }) => invoke("settings:write", async () => { await acceptInvitation(userId, token); return { accepted: true }; }));
  server.registerTool("leave_common_calendar", {
    description: "Quitter le calendrier Commun. Action destructive : demander confirmation, puis confirm à true.",
    inputSchema: z.object({ confirm }),
  }, async () => invoke("settings:write", async () => { await leaveCalendar(userId); return { left: true }; }));
  server.registerTool("rotate_feed", {
    description: "Créer ou renouveler le lien d’abonnement iCalendar d’un agenda. L’adresse renvoyée est secrète, n’est affichée qu’une fois et invalide l’ancien lien.",
    inputSchema: z.object({ calendarId: idSchema }),
  }, async ({ calendarId }) => invoke("settings:write", async () => ({ url: await rotateFeed(userId, calendarId) })));
  server.registerTool("revoke_feed", { description: "Révoquer le lien d’abonnement iCalendar d’un agenda.", inputSchema: z.object({ calendarId: idSchema }) },
    async ({ calendarId }) => invoke("settings:write", async () => { await revokeFeed(userId, calendarId); return { revoked: true }; }));
  server.registerTool("list_oauth_connections", { description: "Lister les connexions OAuth autorisées (clients comme Claude).", inputSchema: z.object({}) },
    async () => invoke("settings:write", () => listConnections(userId)));
  server.registerTool("revoke_oauth_connection", {
    description: "Révoquer une connexion OAuth (clientId de list_oauth_connections). Si c’est celle en cours, l’accès s’arrête aussitôt. Demander confirmation, puis confirm à true.",
    inputSchema: z.object({ clientId: z.string().min(1).max(2048), confirm }),
  }, async ({ clientId }) => invoke("settings:write", async () => { await revokeConnection(userId, clientId); return { revoked: true }; }));
}
