export type Method = "GET" | "POST" | "PUT" | "DELETE";
export type Operation = { tool: string; method: Method; path: string; summary: string; tag: string };

const op = (tag: string, tool: string, method: Method, path: string, summary: string): Operation => ({ tool, method, path, summary, tag });

export const operations: Operation[] = [
  op("Calendriers", "list_calendars", "GET", "/calendars", "Lister les agendas accessibles"),
  op("Calendriers", "export_ics", "GET", "/calendars/{calendarId}/ics", "Exporter un agenda au format iCalendar"),
  op("Calendriers", "rotate_feed", "PUT", "/calendars/{calendarId}/feed", "Créer ou renouveler le lien d’abonnement"),
  op("Calendriers", "revoke_feed", "DELETE", "/calendars/{calendarId}/feed", "Révoquer le lien d’abonnement"),
  op("Calendriers", "leave_common_calendar", "POST", "/calendars/common/leave", "Quitter le calendrier Commun"),
  op("Événements", "list_events", "GET", "/events", "Lister les événements d’une plage"),
  op("Événements", "create_event", "POST", "/events", "Créer un événement"),
  op("Événements", "get_event", "GET", "/events/{eventId}", "Lire un événement et son rappel"),
  op("Événements", "update_event", "PUT", "/events/{eventId}", "Modifier un événement"),
  op("Événements", "delete_event", "DELETE", "/events/{eventId}", "Supprimer un événement"),
  op("Événements", "set_event_reminder", "PUT", "/events/{eventId}/reminder", "Régler son rappel pour un événement"),
  op("Tâches", "list_todos", "GET", "/todos", "Lister les tâches"),
  op("Tâches", "create_todo", "POST", "/todos", "Créer une tâche"),
  op("Tâches", "update_todo", "PUT", "/todos/{todoId}", "Modifier une tâche"),
  op("Tâches", "delete_todo", "DELETE", "/todos/{todoId}", "Supprimer une tâche"),
  op("Tâches", "set_todo_status", "PUT", "/todos/{todoId}/status", "Terminer ou rouvrir une tâche"),
  op("Tâches", "set_todo_email", "PUT", "/settings/todo-email", "Activer ou couper l’e-mail quotidien des tâches"),
  op("Calendriers liés", "list_linked_calendars", "GET", "/linked-calendars", "Lister les calendriers liés"),
  op("Calendriers liés", "add_linked_calendar", "POST", "/linked-calendars", "Lier un calendrier ICS"),
  op("Calendriers liés", "refresh_linked_calendar", "POST", "/linked-calendars/{id}/refresh", "Actualiser un calendrier lié"),
  op("Calendriers liés", "set_linked_calendar_enabled", "PUT", "/linked-calendars/{id}/enabled", "Mettre en pause ou reprendre un calendrier lié"),
  op("Calendriers liés", "remove_linked_calendar", "DELETE", "/linked-calendars/{id}", "Supprimer un calendrier lié"),
  op("Déplacements", "list_travel_days", "GET", "/travel-days", "Lister les jours de déplacement"),
  op("Déplacements", "set_travel_days", "PUT", "/travel-days", "Marquer ou retirer ses jours de déplacement"),
  op("Réglages", "get_settings", "GET", "/settings", "Lire les réglages"),
  op("Réglages", "save_preferences", "PUT", "/settings/preferences", "Enregistrer les préférences de rappel"),
  op("Invitations", "invite_partner", "POST", "/invitations", "Inviter une personne par e-mail"),
  op("Invitations", "accept_invitation", "POST", "/invitations/accept", "Accepter une invitation"),
  op("Invitations", "revoke_invitation", "DELETE", "/invitations/{invitationId}", "Révoquer une invitation"),
  op("Connexions OAuth", "list_oauth_connections", "GET", "/oauth-connections", "Lister les connexions OAuth"),
  op("Connexions OAuth", "revoke_oauth_connection", "DELETE", "/oauth-connections/{clientId}", "Révoquer une connexion OAuth"),
  op("Administration", "get_smtp_config", "GET", "/admin/smtp", "Lire la configuration SMTP"),
  op("Administration", "save_smtp_config", "PUT", "/admin/smtp", "Enregistrer la configuration SMTP"),
  op("Administration", "test_smtp", "POST", "/admin/smtp/test", "Envoyer un e-mail de test SMTP"),
];

export function matchOperation(method: string, pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  for (const candidate of operations) {
    if (candidate.method !== method) continue;
    const pattern = candidate.path.split("/").filter(Boolean);
    if (pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    const matched = pattern.every((part, index) => {
      if (!part.startsWith("{")) return part === segments[index];
      try { params[part.slice(1, -1)] = decodeURIComponent(segments[index]); return true; } catch { return false; }
    });
    if (matched) return { operation: candidate, params };
  }
  return null;
}
