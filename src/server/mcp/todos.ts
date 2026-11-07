import { z } from "zod";
import { completeTodo, deleteTodo, listTodos, saveTodo, saveTodoEmailPreference } from "../todo";
import { idSchema } from "../validation";
import { confirm, version, type ToolContext } from "./context";

const todoFields = z.object({ title: z.string().max(300), visibility: z.enum(["solo", "common"]), dueDate: z.string().length(10).nullable().optional() });

export function registerTodoTools({ server, userId, invoke }: ToolContext) {
  server.registerTool("list_todos", { description: "Lister les tâches Solo et Commun, à faire d’abord. dueDate au format AAAA-MM-JJ.", inputSchema: z.object({}) },
    async () => invoke("calendar:read", async () => (await listTodos(userId)).todos));
  server.registerTool("create_todo", {
    description: "Créer une tâche. visibility (solo ou common) est obligatoire : demander à l’utilisateur s’il ne l’a pas précisé.",
    inputSchema: todoFields,
  }, async input => invoke("todo:write", () => saveTodo(userId, { ...input, dueDate: input.dueDate ?? null })));
  server.registerTool("update_todo", {
    description: "Modifier le titre ou l’échéance d’une tâche (la visibilité ne change pas). Passer la version lue dans list_todos.",
    inputSchema: todoFields.extend({ todoId: idSchema, version }),
  }, async ({ todoId, version: expected, ...input }) => invoke("todo:write", () => saveTodo(userId, { ...input, dueDate: input.dueDate ?? null }, { id: todoId, version: expected })));
  server.registerTool("set_todo_status", {
    description: "Terminer (completed true) ou rouvrir (false) une tâche.",
    inputSchema: z.object({ todoId: idSchema, version, completed: z.boolean() }),
  }, async ({ todoId, version: expected, completed }) => invoke("todo:write", async () => { await completeTodo(userId, todoId, expected, completed); return { completed }; }));
  server.registerTool("delete_todo", {
    description: "Supprimer définitivement une tâche. Action destructive : demander confirmation, puis confirm à true.",
    inputSchema: z.object({ todoId: idSchema, version, confirm }),
  }, async ({ todoId, version: expected }) => invoke("todo:write", async () => { await deleteTodo(userId, todoId, expected); return { deleted: true }; }));
  server.registerTool("set_todo_email", {
    description: "Activer ou couper l’e-mail quotidien des tâches en retard.",
    inputSchema: z.object({ enabled: z.boolean() }),
  }, async ({ enabled }) => invoke("todo:write", async () => { await saveTodoEmailPreference(userId, enabled); return { enabled }; }));
}
