import { AlertTriangle, CheckCircle2, ClipboardList, Clock } from "lucide-react";
import type { Bucket } from "../lib/tasks";

export default function StatCards({ total, counts }: { total: number; counts: Record<Bucket, number> }) {
  const cards = [
    { label: "Total Tasks", value: total, cls: "purple", icon: <ClipboardList size={26} /> },
    { label: "In Progress", value: counts.in_progress, cls: "blue", icon: <Clock size={26} /> },
    { label: "Completed", value: counts.completed, cls: "green", icon: <CheckCircle2 size={26} /> },
    { label: "Overdue", value: counts.overdue, cls: "red", icon: <AlertTriangle size={26} /> },
  ];
  return (
    <div className="stats">
      {cards.map((c) => (
        <div key={c.label} className={`stat ${c.cls}`}>
          <div className="stat-icon">{c.icon}</div>
          <div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
