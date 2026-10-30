import { ArrowUp, Check } from "lucide-react";
import { Bucket, BUCKET_LABEL, Priority } from "../lib/tasks";

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`pill pr-${priority}`}>
      {priority === "high" && <ArrowUp size={11} />}
      {priority[0].toUpperCase() + priority.slice(1)}
    </span>
  );
}

export function StatusPill({ bucket }: { bucket: Bucket }) {
  return (
    <span className={`pill st-${bucket}`}>
      {bucket === "completed" ? <Check size={11} /> : <i className="mini-dot" />}
      {BUCKET_LABEL[bucket]}
    </span>
  );
}
