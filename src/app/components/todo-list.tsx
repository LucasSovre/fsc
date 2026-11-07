import type { Todo } from "../../server/types";
import { deleteTodoAction, todoStatusAction } from "../actions";
import { ActionForm } from "./action-form";
import { TodoForm } from "./todo-form";

export function TodoList({ todos, today }: { todos: Todo[]; today: string }) {
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
  return <ul className="todo-list">{todos.map(todo => <li className="todo-item" key={`${todo.id}-${todo.version}`} data-completed={!!todo.completedAt}>
    <div className="todo-item-heading"><h3>{todo.title}</h3><span className={`todo-visibility todo-${todo.visibility}`}>{todo.visibility === "common" ? "Commun" : "Solo"}</span></div>
    <p className={!todo.completedAt && todo.dueDate && todo.dueDate < today ? "todo-overdue" : "field-help"}>
      {todo.dueDate ? <>{!todo.completedAt && todo.dueDate < today ? "En retard · " : "Échéance · "}<time dateTime={todo.dueDate}>{date.format(new Date(`${todo.dueDate}T12:00:00Z`))}</time></> : "Sans échéance"}
    </p>
    <ActionForm action={todoStatusAction}><input type="hidden" name="id" value={todo.id} /><input type="hidden" name="version" value={todo.version} /><input type="hidden" name="completed" value={todo.completedAt ? "false" : "true"} />
      <button>{todo.completedAt ? "Remettre à faire" : "Marquer comme terminée"}</button>
    </ActionForm>
    <details className="todo-edit"><summary>Modifier ou supprimer</summary>
      <TodoForm todo={todo} canCommon={todo.visibility === "common"} />
      <ActionForm action={deleteTodoAction}>
        <input type="hidden" name="id" value={todo.id} /><input type="hidden" name="version" value={todo.version} />
        <p><label><input type="checkbox" name="confirm" required /> Confirmer la suppression de cette tâche.</label></p><button>Supprimer la tâche</button>
      </ActionForm>
    </details>
  </li>)}</ul>;
}
