"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { listAllUsers, listAllQuizzes, getAdmins, saveAdmins, setUserDisabled, deleteUserDoc, getHomeContent, saveHomeContent } from "@/lib/firestore";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const OWNER_EMAILS = ["yassow@gmail.com", "yasser.ghallab@gmail.com"];

export default function QuPsControlPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [home, setHome] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };

  const toggleDisabled = async (u: any) => {
    setBusy(true);
    try { await setUserDisabled(u.uid, !u.disabled); u.disabled = !u.disabled; setUsers([...users]); flash("Updated " + (u.email || "")); }
    catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); }
    setBusy(false);
  };
  const removeUser = async (u: any) => {
    if (!confirm("Remove " + (u.email || "this user") + " from the database? Their login is NOT deleted (do that in Firebase Console).")) return;
    setBusy(true);
    try { await deleteUserDoc(u.uid); setUsers(users.filter((x) => x.uid !== u.uid)); flash("Removed " + (u.email || "")); }
    catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); }
    setBusy(false);
  };
  const addAdmin = async () => {
    const email = newAdmin.trim().toLowerCase();
    if (!email || email.indexOf("@") < 0) { flash("Enter a valid email"); return; }
    if (admins.includes(email) || OWNER_EMAILS.includes(email)) { flash("Already an admin"); return; }
    const next = admins.concat([email]);
    setBusy(true);
    try { await saveAdmins(next); setAdmins(next); setNewAdmin(""); flash("Added " + email); }
    catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); }
    setBusy(false);
  };
  const removeAdmin = async (email: string) => {
    const next = admins.filter((a) => a !== email);
    setBusy(true);
    try { await saveAdmins(next); setAdmins(next); flash("Removed " + email); }
    catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); }
    setBusy(false);
  };
  const saveContent = async () => {
    setBusy(true);
    try { await saveHomeContent(home); flash("Homepage content saved"); }
    catch (e: any) { flash("Error: " + (e && e.message ? e.message : e)); }
    setBusy(false);
  };

  if (loading || !ready) return <div className="min-h-screen flex items-center justify-center text-xl font-bold">Loading…</div>;

  const TabBtn = ({ id, label }: { id: string; label: string }) => (
    <button onClick={() => setTab(id)} className={"px-4 py-2 rounded-lg font-bold text-sm " + (tab === id ? "bg-kahoot-purple text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>{label}</button>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-1">QuizUps Control</h1>
      <p className="text-gray-500 mb-6">Signed in as {user ? user.email : ""}</p>
      {msg && <div className="mb-4 p-3 rounded-lg bg-amber-100 text-amber-800 text-sm font-semibold">{msg}</div>}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabBtn id="users" label={"Users (" + users.length + ")"} />
        <TabBtn id="admins" label={"Admins (" + (admins.length + OWNER_EMAILS.length) + ")"} />
        <TabBtn id="content" label="Content" />
        <TabBtn id="stats" label="Overview" />
      </div>

      {tab === "users" && (
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-3">Disable blocks sign-in; Remove deletes the database record. To fully delete a login account, use Firebase Console → Authentication.</p>
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.uid || u.email} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{u.displayName || "—"} {u.disabled ? <span className="text-red-500 text-xs">(disabled)</span> : null}</div>
                  <div className="text-gray-500 text-sm truncate">{u.email}</div>
                </div>
                <button onClick={() => toggleDisabled(u)} disabled={busy} className="text-sm font-bold px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">{u.disabled ? "Enable" : "Disable"}</button>
                <button onClick={() => removeUser(u)} disabled={busy} className="text-sm font-bold px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">Remove</button>
              </div>
            ))}
            {!users.length && <p className="text-gray-400">No users yet.</p>}
          </div>
        </Card>
      )}

      {tab === "admins" && (
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-3">Admins can open this console. Owner accounts are permanent and cannot be removed.</p>
          <div className="flex flex-col gap-2 mb-4">
            {OWNER_EMAILS.map((e) => (
              <div key={e} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <span className="flex-1 font-semibold break-all">{e}</span>
                <span className="text-xs font-bold text-gray-400">OWNER</span>
              </div>
            ))}
            {admins.map((e) => (
              <div key={e} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                <span className="flex-1 font-semibold break-all">{e}</span>
                <button onClick={() => removeAdmin(e)} disabled={busy} className="text-sm font-bold px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">Remove</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="new.admin@email.com" className="flex-1 px-3 py-2 rounded-lg border border-gray-200" />
            <Button onClick={addAdmin} disabled={busy}>Add admin</Button>
          </div>
        </Card>
      )}

      {tab === "content" && (
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-3">Homepage hero text (updates the live site).</p>
          <label className="block text-sm font-bold mb-1">Headline line 1</label>
          <input value={home.heroLine1 || ""} onChange={(e) => setHome({ ...home, heroLine1: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 mb-3" />
          <label className="block text-sm font-bold mb-1">Headline line 2</label>
          <input value={home.heroLine2 || ""} onChange={(e) => setHome({ ...home, heroLine2: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 mb-4" />
          <Button onClick={saveContent} disabled={busy}>Save content</Button>
        </Card>
      )}

      {tab === "stats" && (
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 text-center"><div className="text-3xl font-black">{users.length}</div><div className="text-gray-500 text-sm">Users</div></div>
            <div className="p-4 rounded-lg bg-gray-50 text-center"><div className="text-3xl font-black">{quizzes.length}</div><div className="text-gray-500 text-sm">Quizzes</div></div>
          </div>
          <a href="/reports" className="inline-block mt-4 text-kahoot-purple font-semibold hover:underline">Open detailed reports →</a>
        </Card>
      )}
    </div>
  );
}
