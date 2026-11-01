import { Check, Mail, Plus, Users, Zap } from "lucide-react";
import { Activity, Person, timeAgo } from "../lib/tasks";
import Avatar from "./Avatar";

export function TeamPanel({ users, me }: { users: Person[]; me: Person | null }) {
  return (
    <div className="card" id="team-panel">
      <div className="row"><h3>Team Members ({users.length})</h3></div>
      <ul className="team">
        {users.slice(0, 6).map((u) => (
          <li key={u.id}>
            <Avatar name={u.name} picture={u.picture} size={38} />
            <div>
              <b>{u.name}{u.id === me?.id ? " (You)" : ""}</b>
              <div className="muted">{u.email}</div>
            </div>
          </li>
        ))}
      </ul>
      {users.length > 6 && <div className="muted more">+{users.length - 6} more</div>}
    </div>
  );
}

const ICONS: Record<string, JSX.Element> = {
  completed: <Check size={16} />,
  created: <Plus size={16} />,
  assigned: <Users size={16} />,
  email: <Mail size={16} />,
};

export function ActivityPanel({ items }: { items: Activity[] }) {
  return (
    <div className="card">
      <h3>Recent Activity</h3>
      {items.length === 0 && <p className="muted">No activity yet.</p>}
      <ul className="activity">
        {items.map((a) => (
          <li key={a.id}>
            <span className={`act-icon ${a.type}`}>{ICONS[a.type] ?? <Plus size={16} />}</span>
            <span className="act-text">{a.message}</span>
            <small className="muted">{timeAgo(a.created_at)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntegrationsPanel({ emailConnected }: { emailConnected: boolean }) {
  return (
    <div className="card">
      <div className="row">
        <h3><Zap size={16} /> Integrations</h3>
        {emailConnected && <span className="pill st-completed"><Check size={11} /> Connected</span>}
      </div>
      <div className="integration">
        <span className="g big">G</span>
        <div><b>Google OAuth 2.0</b><div className="muted">Login &amp; Authentication</div></div>
        <span className="ok"><Check size={14} /></span>
      </div>
      <div className="integration">
        <span className="gmail"><Mail size={20} /></span>
        <div><b>EmailJS</b><div className="muted">Task Notifications (Create &amp; Complete)</div></div>
        {emailConnected ? (
          <span className="ok"><Check size={14} /></span>
        ) : (
          <span className="pill st-overdue">Not set up</span>
        )}
      </div>
    </div>
  );
}
