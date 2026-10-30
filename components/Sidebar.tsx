import { BarChart3, CheckSquare, ClipboardList, Folder, Home, Layers, Scissors, Settings, User, Users } from "lucide-react";
import type { ReactNode } from "react";

type Item = { key: string; label: string; icon: ReactNode; badge?: string | number };

export default function Sidebar({
  active,
  onNav,
  openAssigned,
  members,
}: {
  active: string;
  onNav: (key: string) => void;
  openAssigned: number;
  members: number;
}) {
  const items: Item[] = [
    { key: "dashboard", label: "Dashboard", icon: <Home size={18} /> },
    { key: "mine", label: "My Tasks", icon: <CheckSquare size={18} /> },
    { key: "assigned", label: "Assigned to Me", icon: <User size={18} />, badge: openAssigned || undefined },
    { key: "all", label: "All Tasks", icon: <Layers size={18} /> },
    { key: "team", label: "Team", icon: <Users size={18} /> },
    { key: "projects", label: "Projects", icon: <Folder size={18} />, badge: "New" },
    { key: "reports", label: "Reports", icon: <BarChart3 size={18} /> },
    { key: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo"><Scissors size={22} /></div>
        <div>
          <div className="brand-name">Hairdrama Tech</div>
          <div className="brand-sub">TaskFlow</div>
        </div>
      </div>

      <nav>
        {items.map((it) => (
          <button key={it.key} className={`nav ${active === it.key ? "active" : ""}`} onClick={() => onNav(it.key)}>
            {it.icon}
            <span>{it.label}</span>
            {it.badge !== undefined && <em className={typeof it.badge === "string" ? "pill-new" : "count"}>{it.badge}</em>}
          </button>
        ))}
      </nav>

      <div className="workspace">
        <div className="ws-icon"><ClipboardList size={20} /></div>
        <div>
          <div className="ws-label">Workspace</div>
          <div className="ws-name">Hairdrama Tech</div>
          <div className="ws-label">{members} members</div>
        </div>
      </div>
    </aside>
  );
}
