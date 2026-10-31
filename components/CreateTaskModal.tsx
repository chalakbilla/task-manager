import { X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Person } from "../lib/tasks";

export type NewTask = { title: string; description: string; assigned_to: string; priority: string; due_date: string };

export default function CreateTaskModal({
  users,
  meId,
  onClose,
  onCreate,
}: {
  users: Person[];
  meId: string;
  onClose: () => void;
  onCreate: (t: NewTask) => Promise<void>;
}) {
  const [form, setForm] = useState<NewTask>({ title: "", description: "", assigned_to: meId, priority: "medium", due_date: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof NewTask, v: string) => setForm({ ...form, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate(form);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="row">
          <h2>Create Task</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <label>Title</label>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} required autoFocus />
        <label>Description</label>
        <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        <label>Assign to</label>
        <select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email}){u.id === meId ? " – me" : ""}</option>
          ))}
        </select>
        <div className="two">
          <div>
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label>Due date</label>
            <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
          </div>
        </div>
        <button className="btn primary full" disabled={busy}>{busy ? "Creating…" : "Create Task"}</button>
      </form>
    </div>
  );
}
