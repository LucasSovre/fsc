import { randomUUID } from "node:crypto";
import { z } from "zod";
import { account, accessibleCalendar } from "./calendar";
import { rows, transaction, type Connection } from "./database";
import { DomainError, todoSchema } from "./validation";
import type { Todo } from "./types";

const accessible = `(c."ownerId"=$1 OR EXISTS(SELECT 1 FROM member m WHERE m."calendarId"=c.id AND m."userId"=$1))`;

export async function listTodos(userId: string) {
  return transaction(async db => {
    const { profile } = await account(db, userId);
    const todos = await rows<Todo>(`SELECT t.*,c.kind AS visibility FROM todo t JOIN calendar c ON c.id=t."calendarId"
      WHERE ${accessible} ORDER BY t."completedAt" NULLS FIRST,t."dueDate" NULLS LAST,t."createdAt",t.id`, [userId], db);
    return { todos, profile };
  });
}
async function todoIn(db: Connection, userId: string, id: string) {
  const [todo] = await rows<Todo>(`SELECT t.*,c.kind AS visibility FROM todo t JOIN calendar c ON c.id=t."calendarId" WHERE t.id=$2 AND ${accessible}`, [userId, id], db);
  if (!todo) throw new DomainError("Tâche introuvable.", 404);
  return todo;
}
export async function saveTodo(userId: string, raw: unknown, edit?: { id: string; version: number }) {
  const input = todoSchema.parse(raw);
  return transaction(async db => {
    const { profile } = await account(db, userId);
    if (edit) {
      const todo = await todoIn(db, userId, edit.id);
      if (todo.version !== edit.version) throw new DomainError("Cette tâche a changé. Recharge la page.", 409);
      if (input.visibility !== todo.visibility) throw new DomainError("La visibilité de cette tâche ne peut pas être changée.");
      await db.query('UPDATE todo SET title=$2,"dueDate"=$3,version=version+1 WHERE id=$1', [todo.id, input.title, input.dueDate]);
      return todoIn(db, userId, todo.id);
    }
    const calendar = input.visibility === "solo" ? await accessibleCalendar(db, userId, profile.calendarId)
      : (await rows<{ id: string }>('SELECT "calendarId" AS id FROM member WHERE "userId"=$1', [userId], db))[0];
    if (!calendar) throw new DomainError("Invite une personne depuis les réglages pour créer des tâches communes.");
    const id = randomUUID();
    await db.query('INSERT INTO todo(id,"calendarId","creatorId",title,"dueDate") VALUES($1,$2,$3,$4,$5)', [id, calendar.id, userId, input.title, input.dueDate]);
    return todoIn(db, userId, id);
  });
}
export async function completeTodo(userId: string, id: string, version: number, completed: boolean) {
  return transaction(async db => {
    await account(db, userId);
    const todo = await todoIn(db, userId, id);
    if (todo.version !== version) throw new DomainError("Cette tâche a changé. Recharge la page.", 409);
    await db.query('UPDATE todo SET "completedAt"=$2,version=version+1 WHERE id=$1', [id, completed ? new Date() : null]);
  });
}
export async function deleteTodo(userId: string, id: string, version: number) {
  return transaction(async db => {
    await account(db, userId);
    const todo = await todoIn(db, userId, id);
    if (todo.version !== version) throw new DomainError("Cette tâche a changé. Recharge la page.", 409);
    await db.query('DELETE FROM todo WHERE id=$1', [id]);
  });
}
export async function saveTodoEmailPreference(userId: string, raw: unknown) {
  const enabled = z.boolean().parse(raw);
  if (enabled && !process.env.SMTP_HOST) throw new DomainError("Le service e-mail n’est pas configuré.");
  return transaction(async db => {
    await account(db, userId);
    await db.query('UPDATE profile SET "todoEmailEnabled"=$2 WHERE "userId"=$1', [userId, enabled]);
  });
}
export async function overdueTodos(db: Connection, userId: string, day: string) {
  return rows<Todo>(`SELECT t.*,c.kind AS visibility FROM todo t JOIN calendar c ON c.id=t."calendarId"
    WHERE ${accessible} AND t."completedAt" IS NULL AND t."dueDate"<$2 ORDER BY t."dueDate",t."createdAt",t.id`, [userId, day], db);
}
