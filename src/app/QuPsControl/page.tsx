"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { listAllUsers, listAllQuizzes, getAdmins, saveAdmins, setUserDisabled, deleteUserDoc, getHomeContent, saveHomeContent } from "@/lib/firestore";
import Button from "@/components/ui/Button";

const OWNER_EMAILS = ["yassow@gmail.com", "yasser.ghallab@gmail.com"];
const NAV = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "users", label: "Users", icon: "👤" },
  { id: "admins", label: "Admins", icon: "🛡️" },
  { id: "content", label: "Content", icon: "✏️" },
  { id: "logs", label: "Logs", icon: "📋" },
];

export default function QuPsControlPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [home, setHome] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    (async () => {
      let list: string[] = [];
      try { list = await getAdmins(); } catch (e) { list = []; }
      const isAdmin = OWNER_EMAILS.includes(user.email || "") || list.includes(user.email || "");
      if (!isAdmin) { router.push("/dashboard"); return; }
      setAdmins(list);
      try {
        const [u, q, h] = await Promise.all([listAllUsers(), listAllQuizzes(), getHomeContent()]);
        setUsers(u); setQuizzes(q); setHome(h);
      } catch (e: any) { setMsg("Failed to load data: " + (e && e.message ? e.message : e)); }
      setReady(true);
    })();
  }, [user, loading, router]);

  useEffect(() => {
    if (tab !== "logs") return;
    setLogsLoading(true);
    fetch("https://polished-shadow-f08c.yassow.workers.dev/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "logs", limit: 100 }) })
      .then((r) => r.json()).then((d) => setLogs(d.logs || [])).catch(() => setLogs([])).finally(() => setLogsLoading(false));
  }, [tab]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };
  const toggleDisabled = async (u: any) => { setBusy(true); try { await setUserDisabled(u.uid, !u.disabled); u.disabled = !u.disabled; setUsers([...users]); flash("Updated " + (u.email || "")); } catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); } setBusy(false); };
  const removeUser = async (u: any) => { if (!confirm("Remove " + (u.email || "this user") + " from the database? Their login is NOT deleted (do that in Firebase Console).")) return; setBusy(true); try { await deleteUserDoc(u.uid); setUsers(users.filter((x) => x.uid !== u.uid)); flash("Removed " + (u.email || "")); } catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); } setBusy(false); };
  const addAdmin = async () => { const email = newAdmin.trim().toLowerCase(); if (!email || email.indexOf("@") < 0) { flash("Enter a valid email"); return; } if (admins.includes(email) || OWNER_EMAILS.includes(email)) { flash("Already an admin"); return; } const next = admins.concat([email]); setBusy(true); try { await saveAdmins(next); setAdmins(next); setNewAdmin(""); flash("Added " + email); } catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); } setBusy(false); };
  const removeAdmin = async (email: string) => { const next = admins.filter((a) => a !== email); setBusy(true); try { await saveAdmins(next); setAdmins(next); flash("Removed " + email); } catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); } setBusy(false); };
  const saveContent = async () => { setBusy(true); try { await saveHomeContent(home); flash("Homepage content saved"); } catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); } setBusy(false); };

  if (loading || !ready) return <div className="min-h-screen flex items-center justify-center text-xl font-bold text-gray-500">Loading…</div>;

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col md:flex-row bg-gray-50">
      <aside className="md:w-60 shrink-0 bg-white md:border-r border-gray-200 p-3 md:p-4">
        <div className="px-2 py-3 hidden md:block">
          <div className="font-black text-lg text-gray-900">QuizUps Control</div>
          <div className="text-xs text-gray-400 truncate">{user ? user.email : ""}</div>
        </div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={"flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors " + (tab === n.id ? "bg-kahoot-purple text-white" : "text-gray-600 hover:bg-gray-100")}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
          <a href="/reports" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-kahoot-purple hover:bg-gray-100 whitespace-nowrap">📈 Reports →</a>
        </nav>
      </aside>

      <main className="flex-1 p-5 md:p-10">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-black text-gray-900 mb-1 capitalize">{tab}</h1>
          <p className="text-gray-400 text-sm mb-6">Manage your QuizUps platform</p>
          {msg && <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">{msg}</div>}

          {tab === "overview" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center"><div className="text-4xl font-black text-gray-900">{users.length}</div><div className="text-gray-400 text-sm mt-1">Users</div></div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center"><div className="text-4xl font-black text-gray-900">{quizzes.length}</div><div className="text-gray-400 text-sm mt-1">Quizzes &amp; polls</div></div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center"><div className="text-4xl font-black text-gray-900">{admins.length + OWNER_EMAILS.length}</div><div className="text-gray-400 text-sm mt-1">Admins</div></div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center"><div className="text-4xl font-black text-gray-900">{users.filter((u: any) => u.disabled).length}</div><div className="text-gray-400 text-sm mt-1">Disabled</div></div>
            </div>
          )}

          {tab === "users" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 text-sm text-gray-500">Disable blocks sign-in; Remove deletes the database record. Full login deletion is in Firebase Console → Authentication.</div>
              <div className="divide-y divide-gray-100">
                {users.map((u) => (
                  <div key={u.uid || u.email} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-kahoot-purple/10 text-kahoot-purple flex items-center justify-center font-black shrink-0">{(u.displayName || u.email || "?").charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">{u.displayName || "—"} {u.disabled ? <span className="text-red-500 text-xs">(disabled)</span> : null}</div>
                      <div className="text-gray-400 text-sm truncate">{u.email}</div>
                    </div>
                    <button onClick={() => toggleDisabled(u)} disabled={busy} className="text-sm font-bold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">{u.disabled ? "Enable" : "Disable"}</button>
                    <button onClick={() => removeUser(u)} disabled={busy} className="text-sm font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Remove</button>
                  </div>
                ))}
                {!users.length && <p className="p-6 text-gray-400">No users yet.</p>}
              </div>
            </div>
          )}

          {tab === "admins" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-4">Admins can open this console. Owner accounts are permanent and cannot be removed.</p>
              <div className="flex flex-col gap-2 mb-5">
                {OWNER_EMAILS.map((e) => (<div key={e} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"><span className="flex-1 font-semibold text-gray-700 break-all">{e}</span><span className="text-xs font-black text-gray-400">OWNER</span></div>))}
                {admins.map((e) => (<div key={e} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100"><span className="flex-1 font-semibold text-gray-700 break-all">{e}</span><button onClick={() => removeAdmin(e)} disabled={busy} className="text-sm font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Remove</button></div>))}
              </div>
              <div className="flex gap-2">
                <input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="new.admin@email.com" className="flex-1 px-3 py-2 rounded-xl border border-gray-200" />
                <Button onClick={addAdmin} disabled={busy}>Add admin</Button>
              </div>
            </div>
          )}

          {tab === "content" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-4">Homepage hero text (updates the live site).</p>
              <label className="block text-sm font-bold mb-1 text-gray-700">Headline line 1</label>
              <input value={home.heroLine1 || ""} onChange={(e) => setHome({ ...home, heroLine1: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 mb-4" />
              <label className="block text-sm font-bold mb-1 text-gray-700">Headline line 2</label>
              <input value={home.heroLine2 || ""} onChange={(e) => setHome({ ...home, heroLine2: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 mb-5" />
              <Button onClick={saveContent} disabled={busy}>Save content</Button>
            </div>
          )}

          {tab === "logs" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 text-sm text-gray-500 flex items-center justify-between"><span>Recent AI + email events (successes & failures)</span><span>{logsLoading ? "Loading…" : logs.length + " shown"}</span></div>
              <div className="divide-y divide-gray-100 max-h-[70vh] overflow-auto">
                {logs.map((l, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 text-sm">
                    <span className={"mt-1 w-2 h-2 rounded-full shrink-0 " + (l.ok ? "bg-green-500" : "bg-red-500")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800">{l.type}{l.provider ? " · " + l.provider : ""} — {l.ok ? "OK" : "FAILED"}</div>
                      <div className="text-gray-400 truncate">{l.topic || l.to || ""}{l.detail ? " · " + l.detail : ""}</div>
                    </div>
                    <span className="text-gray-300 text-xs shrink-0">{(l.at || "").replace("T", " ").slice(0, 19)}</span>
                  </div>
                ))}
                {!logsLoading && !logs.length && <p className="p-6 text-gray-400">No logs yet.</p>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
