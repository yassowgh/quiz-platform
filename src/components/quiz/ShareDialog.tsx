"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { setQuizCollaborators } from "@/lib/firestore";
import { sendCollabInvite, isValidEmail } from "@/lib/integrations";
import Button from "@/components/ui/Button";

export type CollabRole = "edit" | "host";
export type Collaborator = { email: string; role: CollabRole; invitedAt: number; invitedByName?: string };

export default function ShareDialog({ quiz, onClose, onSaved }: { quiz: any; onClose: () => void; onSaved?: (q: any) => void }) {
  const { user } = useAuth();
  const { t } = useLang();
  const [list, setList] = useState<Collaborator[]>((quiz && quiz.collaborators) || []);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollabRole>("edit");
  const [status, setStatus] = useState<"" | "saving" | "sent" | "err" | "invalid" | "dupe" | "self">("");
  const [busy, setBusy] = useState("");

  const inviterName = (user && (user.displayName || user.email)) || "A QuizUps host";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://quizups.com";
  const kind = quiz && quiz.kind === "poll" ? "poll" : "quiz";

  const persist = async (next: Collaborator[]) => {
    const editors = next.filter((c) => c.role === "edit").map((c) => c.email);
    const hosts = next.filter((c) => c.role === "host").map((c) => c.email);
    await setQuizCollaborators(quiz.id, next, editors, hosts);
    setList(next);
    if (onSaved) onSaved({ ...quiz, collaborators: next, collabEditors: editors, collabHosts: hosts });
  };

  const add = async () => {
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) { setStatus("invalid"); return; }
    if (user && clean === String(user.email || "").toLowerCase()) { setStatus("self"); return; }
    if (list.some((c) => c.email === clean)) { setStatus("dupe"); return; }
    setStatus("saving");
    try {
      await persist(list.concat([{ email: clean, role: role, invitedAt: Date.now(), invitedByName: inviterName }]));
      setEmail("");
      try {
        await sendCollabInvite({
          toEmail: clean,
          inviterName: inviterName,
          quizTitle: quiz.title || "Untitled",
          role: role,
          kind: kind,
          link: origin + (role === "edit" ? "/quiz/edit?id=" : "/game/lobby?quizId=") + quiz.id,
        });
      } catch (e) { /* access is granted even if the email bounces */ }
      setStatus("sent");
    } catch (e) {
      setStatus("err");
    }
  };

  const remove = async (target: string) => {
    setBusy(target);
    try { await persist(list.filter((c) => c.email !== target)); } catch (e) { setStatus("err"); }
    setBusy("");
  };

  const note: Record<string, string> = {
    invalid: t("That email address does not look right."),
    dupe: t("That person already has access."),
    self: t("That is your own account - you already own this."),
    err: t("Could not save. Please try again."),
    sent: t("Invite sent."),
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-black mb-1">{t("Share")} &ldquo;{quiz.title || t("Untitled")}&rdquo;</h3>
        <p className="text-sm text-gray-500 mb-4">
          {t("Invite someone by email. They get access as soon as they sign in with that address and verify it.")}
        </p>

        <div className="flex flex-col gap-2 mb-2">
          <input
            id="collab-email"
            type="email"
            dir="auto"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status !== "saving") setStatus(""); }}
            placeholder="colleague@example.com"
            className="w-full rounded-lg border-2 border-gray-200 py-2 px-3 font-semibold focus:outline-none focus:border-kahoot-purple"
          />
          <div className="flex gap-2">
            <select
              id="collab-role"
              value={role}
              onChange={(e) => setRole(e.target.value as CollabRole)}
              className="flex-1 rounded-lg border-2 border-gray-200 py-2 px-3 font-semibold text-sm"
            >
              <option value="edit">{t("Can edit and host")}</option>
              <option value="host">{t("Can host games only")}</option>
            </select>
            <Button size="sm" onClick={add} loading={status === "saving"} disabled={!email.trim()}>
              {t("Invite")}
            </Button>
          </div>
        </div>

        {status && status !== "saving" && (
          <p className={"text-xs mb-3 font-semibold " + (status === "sent" ? "text-green-600" : "text-red-500")}>
            {note[status]}
          </p>
        )}

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{t("People with access")}</p>
          <div className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user ? user.email : ""}</p>
              <p className="text-xs text-gray-400">{t("Owner")}</p>
            </div>
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">{t("Nobody else yet.")}</p>
          ) : (
            list.map((c) => (
              <div key={c.email} className="flex items-center justify-between gap-3 py-2 border-t border-gray-50">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.email}</p>
                  <p className="text-xs text-gray-400">{c.role === "edit" ? t("Can edit and host") : t("Can host games only")}</p>
                </div>
                <button
                  onClick={() => remove(c.email)}
                  disabled={busy === c.email}
                  className="text-xs font-bold text-red-500 hover:underline shrink-0"
                >
                  {busy === c.email ? t("Removing...") : t("Remove")}
                </button>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          {t("Collaborators cannot delete this, invite other people, or change who has access.")}
        </p>

        <div className="flex justify-end mt-4">
          <Button size="sm" variant="secondary" onClick={onClose}>{t("Done")}</Button>
        </div>
      </div>
    </div>
  );
}
