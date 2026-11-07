import { Temporal } from "temporal-polyfill";
import type { Todo } from "./types";

export function todoDigestDay(now: Date, timeZone: string) {
  const local = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(timeZone);
  return local.hour >= 9 ? local.toPlainDate().toString() : null;
}

export function todoDigestText(todos: Todo[], url: string) {
  return `Voici tes tâches en retard :\n\n${todos.map(todo => `• ${todo.title.replace(/\s+/g, " ")} — échéance ${todo.dueDate} · ${todo.visibility === "common" ? "Commun" : "Solo"}`).join("\n")}\n\nOuvrir mes tâches : ${url}\n\nTu peux désactiver ce récapitulatif quotidien dans l’onglet Todo.`;
}
