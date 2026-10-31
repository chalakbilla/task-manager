import { Calendar, Filter, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { bucketOf, canEdit, formatDate, nextActions, Person, Status, Task, todayStr } from "../lib/tasks";
import Avatar from "./Avatar";
import { PriorityPill, StatusPill } from "./Pills";

export type Tab = "mine" | "created" | "all";

type Props = {
  tasks: Task[];
  counts: Record<Tab, number>;
  tab: Tab;
  setTab: (t: Tab) => void;
  priority: string;
  setPriority: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  me: Person;
  onStatus: (t: Task, s: Status) => void;
};

export default function TaskTable({ tasks, counts, tab, setTab, priority, setPriority, status, setStatus, me, onStatus }: Props) {
  const today = todayStr();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "mine", label: "My Tasks" },
    { key: "created", label: "Assigned by Me" },
    { key: "all", label: "All Tasks" },
  ];

  return (
    <div className="card" id="tasks-card">
      <div className="row tabs-row">
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t.key} className={tab === t.key ? "tab on" : "tab"} onClick={() => setTab(t.key)}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <div className="filters">
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <button
            className="icon-btn boxed"
            title="Clear filters"
            onClick={() => {
              setPriority("all");
              setStatus("all");
            }}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={7} className="muted empty">No tasks match.</td></tr>
            )}
            {tasks.map((t) => {
              const editable = canEdit(t, me.id);
              const done = t.status === "completed";
              return (
                <tr key={t.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={!editable || done}
                      onChange={() => onStatus(t, "completed")}
                      title={editable ? "Mark complete" : "Only the creator or assignee can update this task"}
                    />
                  </td>
                  <td className="t-title">{t.title}</td>
                  <td>
                    <span className="who"><Avatar name={t.assignee.name} picture={t.assignee.picture} size={26} /> {t.assignee.name}</span>
                  </td>
                  <td><PriorityPill priority={t.priority} /></td>
                  <td><StatusPill bucket={bucketOf(t, today)} /></td>
                  <td className={done ? "due struck" : "due"}><Calendar size={14} /> {formatDate(t.due_date)}</td>
                  <td className="menu-cell">
                    {editable && (
                      <>
                        <button
                          className="icon-btn"
                          aria-label="Task actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === t.id ? null : t.id);
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {openMenu === t.id && (
                          <div className="menu right">
                            {nextActions(t.status).map((a) => (
                              <button key={a.to} onClick={() => onStatus(t, a.to)}>{a.label}</button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
