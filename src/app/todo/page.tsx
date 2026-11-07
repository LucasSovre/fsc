import { requireUser } from "../../server/session";
import { settings } from "../../server/calendar";
import { listTodos } from "../../server/todo";
import { localDate } from "../../server/validation";
import { TodoForm } from "../components/todo-form";
import { TodoList } from "../components/todo-list";
import { ActionForm } from "../components/action-form";
import { todoEmailAction } from "../actions";
import { Notice } from "../components/notice";

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const user = await requireUser();
  const { todos, profile } = await listTodos(user.id), { calendars } = await settings(user.id);
  const today = localDate(new Date(), profile.timeZone);
  const late = todos.filter(todo => !todo.completedAt && todo.dueDate && todo.dueDate < today);
  const pending = todos.filter(todo => !todo.completedAt && (!todo.dueDate || todo.dueDate >= today));
  const completed = todos.filter(todo => todo.completedAt);
  return <><h1>Todo</h1><Notice code={ok} />
    <p className="page-intro">Tes tâches personnelles et communes, avec leurs échéances.</p>
    <details className="todo-add"><summary>Ajouter une tâche</summary><TodoForm canCommon={calendars.some(calendar => calendar.kind === "common")} /></details>
    <details><summary>Récapitulatif quotidien par e-mail</summary>
      <p className="field-help">À 9 h dans ton fuseau ({profile.timeZone}), un e-mail regroupe les tâches non terminées dont l’échéance est passée. Aucun envoi si tout est à jour. Ce choix est personnel et indépendant des rappels du calendrier.</p>
      <ActionForm action={todoEmailAction}><p><label><input type="checkbox" name="todoEmailEnabled" defaultChecked={profile.todoEmailEnabled} /> Recevoir les tâches en retard chaque jour</label></p><button>Enregistrer ma préférence</button></ActionForm>
    </details>
    {!!late.length && <section><h2>En retard <span className="todo-count">{late.length}</span></h2><TodoList todos={late} today={today} /></section>}
    <section><h2>À faire <span className="todo-count">{pending.length}</span></h2>
      {pending.length ? <TodoList todos={pending} today={today} /> : <p className="empty-state">{late.length ? "Aucune autre tâche à faire." : "Tout est à jour. Ajoute une tâche pour commencer."}</p>}
    </section>
    {!!completed.length && <details><summary>Terminées ({completed.length})</summary><TodoList todos={completed} today={today} /></details>}
  </>;
}
