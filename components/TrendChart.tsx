import { dayKey, Task } from "../lib/tasks";

const W = 520, H = 200, L = 36, RIGHT = 16, T = 26, B = 30;

/** Line chart (hand-written SVG): number of tasks created per day over the last 7 days. */
export default function TrendChart({ tasks }: { tasks: Task[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const counts = days.map((d) => tasks.filter((t) => dayKey(new Date(t.created_at)) === dayKey(d)).length);

  const step = Math.ceil(Math.max(4, ...counts) / 4);
  const top = step * 4;
  const plotW = W - L - RIGHT;
  const plotH = H - T - B;
  const x = (i: number) => L + (i * plotW) / 6;
  const y = (v: number) => T + plotH - (v / top) * plotH;

  const line = counts.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `M${x(0)},${y(0)} ` + counts.map((v, i) => `L${x(i)},${y(v)}`).join(" ") + ` L${x(6)},${y(0)} Z`;
  const last = counts[6];
  const tipY = Math.max(2, y(last) - 34);

  return (
    <div className="card">
      <h3>
        Task Trends <small className="muted">(Last 7 Days · tasks created)</small>
      </h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={L} x2={W - RIGHT} y1={y(k * step)} y2={y(k * step)} stroke="#eceaf5" />
            <text x={L - 8} y={y(k * step) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{k * step}</text>
          </g>
        ))}

        <path d={area} fill="url(#trendFill)" />
        <polyline points={line} fill="none" stroke="#7c3aed" strokeWidth="2" />
        {counts.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="#7c3aed" stroke="#fff" strokeWidth="1.5" />
        ))}

        <rect x={x(6) - 62} y={tipY} width="66" height="22" rx="6" fill="#6d28d9" />
        <text x={x(6) - 29} y={tipY + 15} textAnchor="middle" fontSize="11" fill="#fff">
          {last} {last === 1 ? "task" : "tasks"}
        </text>

        {days.map((d, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
            {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
    </div>
  );
}
