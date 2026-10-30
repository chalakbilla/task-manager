import { Bell, ChevronDown, LogOut, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logout } from "../lib/api";
import type { Person } from "../lib/tasks";
import Avatar from "./Avatar";

export default function Topbar({
  me,
  search,
  setSearch,
  hasAlerts,
}: {
  me: Person | null;
  search: string;
  setSearch: (v: string) => void;
  hasAlerts: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);

  // Ctrl+K focuses the search box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const close = () => setMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <header className="topbar">
      <div className="search">
        <Search size={16} />
        <input ref={input} placeholder="Search tasks, people…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <kbd>Ctrl + K</kbd>
      </div>

      <div className="topbar-right">
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={20} />
          {hasAlerts && <i className="dot" />}
        </button>
        <div className="chip"><span className="g">G</span> Signed in with Google</div>
        <div className="user" onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}>
          {me && <Avatar name={me.name} picture={me.picture} size={36} />}
          <strong>{me?.name}</strong>
          <ChevronDown size={16} />
          {menu && (
            <div className="menu right" onClick={(e) => e.stopPropagation()}>
              <button onClick={logout}><LogOut size={14} /> Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
