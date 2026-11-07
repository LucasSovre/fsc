"use client";

export function TodoToggle({ id, version, title, completed }: { id: string; version: number; title: string; completed: boolean }) {
  return <>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /><input type="hidden" name="completed" value={completed ? "false" : "true"} />
    <label className="todo-check"><input type="checkbox" defaultChecked={completed} aria-label={`${completed ? "Remettre à faire" : "Terminer"} : ${title}`} onChange={event => event.currentTarget.form?.requestSubmit()} /><span aria-hidden="true">{completed ? "Terminée · remettre à faire" : "Marquer comme terminée"}</span></label>
  </>;
}
