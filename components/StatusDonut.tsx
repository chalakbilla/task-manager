import { Bucket, BUCKET_COLOR, BUCKET_LABEL } from "../lib/tasks";

const ORDER: Bucket[] = ["completed", "in_progress", "pending", "overdue"];
const R = 54;
const C = 2 * Math.PI * R; // circumference

/** Donut drawn with SVG circles: each slice is a stroke-dasharray arc. */
export default function StatusDonut({ total, counts }: { total: number; counts: Record<Bucket, number> }) {
  let offset = 0;
  return (
    <div className="card">
      <h3>Task Status</h3>
      <div className="donut-row">
        <svg viewBox="0 0 140 140" width="150" height="150">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#eceaf5" strokeWidth="18" />
          {ORDER.map((b) => {
            const len = total ? (counts[b] / total) * C : 0;
            const el = (
              <circle
                key={b}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={BUCKET_COLOR[b]}
                strokeWidth="18"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += len;
            return el;
          })}
          <text x="70" y="70" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1e1b3a">{total}</text>
          <text x="70" y="90" textAnchor="middle" fontSize="12" fill="#6b7280">Tasks</text>
        </svg>

        <ul className="legend">
          {ORDER.map((b) => (
            <li key={b}>
              <i style={{ background: BUCKET_COLOR[b] }} />
              <span>{BUCKET_LABEL[b]}</span>
              <b>{counts[b]}</b>
              <small>({total ? Math.round((counts[b] / total) * 100) : 0}%)</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
