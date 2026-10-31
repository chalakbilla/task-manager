import { LayoutGrid, Plus } from "lucide-react";
import { Bucket, bucketOf, canEdit, nextActions, Person, Status, Task, todayStr } from "../lib/tasks";
import Avatar from "./Avatar";
import { PriorityPill } from "./Pills";

const COLUMNS: { key: Bucket; title: string }[] = [
  { key: "pending", title: "To Do" },
  { key: "in_progress", title: "In Progress" },
  { key: "completed", title: "Completed" },
  { key: "overdue", title: "Overdue" },
];
const MAX_CARDS = 3;

export default function TaskBoard({
  tasks,
  me,
  onStatus,
  onAdd,
}: {
  tasks: Task[];
  me: Person;
  onStatus: (t: Task, s: Status) => void;
  onAdd: () => void;
}) {
  const today = todayStr();
  return (
    <div className="card" id="board-card">
      <h3 className="board-title"><LayoutGrid size={18} /> Task Board</h3>
      <div className="board">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => bucketOf(t, today) === col.key);
          return (
            <div key={col.key} className={`col col-${col.key}`}>
              <div className="col-head">
                <b>{col.title} ({items.length})</b>
                <button className="icon-btn" aria-label={`Add task to ${col.title}`} onClick={onAdd}><Plus size={16} /></button>
              </div>
              {items.slice(0, MAX_CARDS).map((t) => {
                const step = nextActions(t.status)[0];
                return (
                  <div className="bcard" key={t.id}>
                    <div className="bcard-title">{t.title}</div>
                    <div className="row">
                      <PriorityPill priority={t.priority} />
                      <Avatar name={t.assignee.name} picture={t.assignee.picture} size={24} />
                    </div>
                    {canEdit(t, me.id) && t.status !== "completed" && (
                      <button className="link" onClick={() => onStatus(t, step.to)}>{step.label} →</button>
                    )}
                  </div>
                );
              })}
              {items.length > MAX_CARDS && <div className="muted more">+{items.length - MAX_CARDS} more</div>}
              {items.length === 0 && <div className="muted more">Nothing here</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
