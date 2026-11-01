"use client";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CreateTaskModal, { NewTask } from "../../components/CreateTaskModal";
import { ActivityPanel, IntegrationsPanel, TeamPanel } from "../../components/RightPanels";
import Sidebar from "../../components/Sidebar";
import StatCards from "../../components/StatCards";
import StatusDonut from "../../components/StatusDonut";
import TaskBoard from "../../components/TaskBoard";
import TaskTable, { Tab } from "../../components/TaskTable";
import Topbar from "../../components/Topbar";
import TrendChart from "../../components/TrendChart";
import { api } from "../../lib/api";
import { Activity, Bucket, bucketOf, Person, Status, Task, todayStr } from "../../lib/tasks";

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const [me, setMe] = useState<Person | null>(null);
  const [users, setUsers] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  const [nav, setNav] = useState("dashboard");
  const [tab, setTab] = useState<Tab>("mine");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 8000);
  }, []);

  const refresh = useCallback(async () => {
    const [t, a] = await Promise.all([api<Task[]>("/api/tasks"), api<Activity[]>("/api/activity")]);
    setTasks(t);
    setActivity(a);
  }, []);

  // First load: profile, team and tasks
  useEffect(() => {
    Promise.all([api<Person>("/api/me"), api<Person[]>("/api/users"), refresh()])
      .then(([profile, team]) => {
        setMe(profile);
        setUsers(team);
      })
      .catch((e) => notify(e.message));
  }, [refresh, notify]);

  async function createTask(form: NewTask) {
    try {
      const res = await api<{ task: Task; email_sent: boolean; email_error?: string }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ ...form, due_date: form.due_date || null }),
      });
      setShowModal(false);
      notify(res.email_sent ? "Task created and email sent." : `Task created. Email not sent: ${res.email_error || "unknown reason"}`);
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  }

  async function changeStatus(t: Task, s: Status) {
    try {
      const res = await api<{ email_sent: boolean; email_error?: string }>(`/api/tasks/${t.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: s }),
      });
      if (s === "in_progress") {
        notify(res.email_sent ? "Task started. Notification email sent." : res.email_error ? `Task started. Email not sent: ${res.email_error}` : "Task started.");
      } else if (s === "completed") {
        notify(res.email_sent ? "Task completed. Notification email sent." : res.email_error ? `Task completed. Email not sent: ${res.email_error}` : "Task completed.");
      } else {
        notify("Task moved to pending.");
      }
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  }

  function onNav(key: string) {
    setNav(key);
    if (key === "dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
    else if (key === "mine") { setTab("mine"); setStatus("all"); scrollTo("tasks-card"); }
    else if (key === "assigned") { setTab("mine"); setStatus("open"); scrollTo("tasks-card"); }
    else if (key === "all") { setTab("all"); setStatus("all"); scrollTo("tasks-card"); }
    else if (key === "team") scrollTo("team-panel");
    else notify("Coming soon.");
  }

  // ---- derived data
  const today = todayStr();
  const mine = tasks.filter((t) => t.assigned_to === me?.id);
  const created = tasks.filter((t) => t.created_by === me?.id);
  const byTab: Record<Tab, Task[]> = { mine, created, all: tasks };

  const counts: Record<Bucket, number> = { pending: 0, in_progress: 0, completed: 0, overdue: 0 };
  tasks.forEach((t) => counts[bucketOf(t, today)]++);

  const q = search.trim().toLowerCase();
  const matches = (t: Task) =>
    !q || [t.title, t.assignee.name, t.creator.name].some((s) => s.toLowerCase().includes(q));

  const tableTasks = byTab[tab].filter((t) => {
    const b = bucketOf(t, today);
    return (
      matches(t) &&
      (priority === "all" || t.priority === priority) &&
      (status === "all" || (status === "open" ? b !== "completed" : b === status))
    );
  });
  const boardTasks = tasks.filter(matches);
  const openAssigned = mine.filter((t) => t.status !== "completed").length;

  if (!me) return <div className="center-screen muted">Loading…</div>;

  return (
    <div className="app">
      <Sidebar active={nav} onNav={onNav} openAssigned={openAssigned} members={users.length} />

      <div className="content">
        <Topbar me={me} search={search} setSearch={setSearch} hasAlerts={openAssigned > 0} />

        <div className="grid">
          <main className="left">
            <div className="row greet">
              <div>
                <h1>{greeting()}, {me.name.split(" ")[0]}! 👋</h1>
                <p className="muted">Here&apos;s what&apos;s happening at Hairdrama Tech.</p>
              </div>
              <button className="btn primary" onClick={() => setShowModal(true)}><Plus size={16} /> Create Task</button>
            </div>

            <StatCards total={tasks.length} counts={counts} />

            <div className="two-col">
              <StatusDonut total={tasks.length} counts={counts} />
              <TrendChart tasks={tasks} />
            </div>

            <TaskTable
              tasks={tableTasks}
              counts={{ mine: mine.length, created: created.length, all: tasks.length }}
              tab={tab}
              setTab={setTab}
              priority={priority}
              setPriority={setPriority}
              status={status}
              setStatus={setStatus}
              me={me}
              onStatus={changeStatus}
            />

            <TaskBoard tasks={boardTasks} me={me} onStatus={changeStatus} onAdd={() => setShowModal(true)} />
          </main>

          <aside className="right">
            <TeamPanel users={users} me={me} />
            <ActivityPanel items={activity} />
            <IntegrationsPanel emailConnected={!!me.email_configured} />
          </aside>
        </div>
      </div>

      {showModal && <CreateTaskModal users={users} meId={me.id} onClose={() => setShowModal(false)} onCreate={createTask} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
