export type Priority = "low" | "medium" | "high";
export type Status = "pending" | "in_progress" | "completed";
/** A task's display bucket: its status, except open tasks past their due date are "overdue". */
export type Bucket = Status | "overdue";

export type Person = {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  email_configured?: boolean;
};

export type Brief = { name: string; email: string; picture: string | null };

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  due_date: string | null; // YYYY-MM-DD
  created_by: string;
  assigned_to: string;
  created_at: string;
  completed_at: string | null;
  creator: Brief;
  assignee: Brief;
};

export type Activity = { id: string; type: string; message: string; created_at: string };

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => dayKey(new Date());

export function bucketOf(t: Task, today = todayStr()): Bucket {
  if (t.status === "completed") return "completed";
  if (t.due_date && t.due_date < today) return "overdue";
  return t.status;
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

export const BUCKET_COLOR: Record<Bucket, string> = {
  completed: "#22a73b",
  in_progress: "#2f7cf6",
  pending: "#f5b82e",
  overdue: "#ef4444",
};

export const canEdit = (t: Task, meId: string) => t.created_by === meId || t.assigned_to === meId;

/** What a user can do next with a task (used by the row menu and board buttons). */
export function nextActions(status: Status): { label: string; to: Status }[] {
  if (status === "pending")
    return [
      { label: "Start progress", to: "in_progress" },
      { label: "Mark complete", to: "completed" },
    ];
  if (status === "in_progress")
    return [
      { label: "Mark complete", to: "completed" },
      { label: "Move to pending", to: "pending" },
    ];
  return [{ label: "Reopen", to: "in_progress" }];
}

export function formatDate(d: string | null): string {
  if (!d) return "No due date";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
