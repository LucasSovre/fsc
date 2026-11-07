import type { Todo } from "../../server/types";
import { todoAction } from "../actions";
import { ActionForm } from "./action-form";

export function TodoForm({ todo, canCommon }: { todo?: Todo; canCommon: boolean }) {
  return <ActionForm action={todoAction}>
    {todo ? <><input type="hidden" name="id" value={todo.id} /><input type="hidden" name="version" value={todo.version} /><input type="hidden" name="visibility" value={todo.visibility} /></> :
      <fieldset className="visibility-field"><legend>Qui peut voir cette tâche ?</legend>
        <div className="visibility-options">
          <label className="visibility-option visibility-solo"><input type="radio" name="visibility" value="solo" required /><span>Solo</span><svg className="visibility-check" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="m6 10 3 3 5-6" /></svg></label>
          <label className="visibility-option visibility-common"><input type="radio" name="visibility" value="common" required disabled={!canCommon} /><span>Commun</span><svg className="visibility-check" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="m6 10 3 3 5-6" /></svg></label>
        </div>
        {!canCommon && <p>Invite une personne depuis les réglages pour partager des tâches.</p>}
      </fieldset>}
    <p><label>Tâche<input name="title" required maxLength={300} defaultValue={todo?.title} /></label></p>
    <p><label>Échéance (facultative)<input name="dueDate" type="date" defaultValue={todo?.dueDate ?? ""} /></label></p>
    <button>{todo ? "Enregistrer la tâche" : "Ajouter la tâche"}</button>
  </ActionForm>;
}
