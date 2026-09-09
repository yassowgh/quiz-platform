"use client";
import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AiProgress from "@/components/ui/AiProgress";
import { useLang } from "@/contexts/LanguageContext";
import type { Question } from "@/types";
import { makeBlankQuestion } from "@/lib/firestore";
import { generateQuestions, generateFromUrl, uploadImage } from "@/lib/integrations";
import { extractTextFromFile } from "@/lib/docExtract";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";

function uploadCompressed(file: File, cb: (url: string) => void) {
  compressImageToDataUrl(file, async (dataUrl) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const url = await uploadImage(blob);
      cb(url);
    } catch {
      cb(dataUrl);
    }
  });
}

function compressImageToDataUrl(file: File, cb: (url: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 600 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const c = canvas.getContext("2d");
      if (!c) return;
      c.drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

interface SortableQuestionProps {
  startExpanded?: boolean;
  question: Question;
  index: number;
  onChange: (q: Question) => void;
  onDelete: () => void;
  kind?: string;
}

function PollPreview({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const type = question.type || "poll";
  const lo = question.scaleMin ?? 0, hi = question.scaleMax ?? 10;
  const barColors = ["bg-kahoot-red", "bg-kahoot-blue", "bg-kahoot-yellow", "bg-kahoot-green", "bg-kahoot-purple", "bg-pink-500"];
  const [edit, setEdit] = useState<string | number | null>(null);
  const opts: string[] = question.options || [];
  const setOpt = (i: number, v: string) => { const o = opts.slice(); while (o.length <= i) o.push(""); o[i] = v; onChange({ ...question, options: o }); };
  const showOpts = (type === "poll" || type === "multiple" || type === "ranking") ? (opts.length ? opts : ["", ""]) : opts;
  const editCls = "rounded-lg py-2 px-3 text-sm font-bold text-gray-900 w-full";
  return (
    <div className="mt-2 rounded-xl border-2 border-dashed border-kahoot-purple/30 bg-kahoot-dark p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">👀 What participants see</p>
        <p className="text-[10px] text-white/30">double-click to edit</p>
      </div>
      {edit === "title" ? (
        <input autoFocus dir="auto" value={question.text || ""} onChange={(e) => onChange({ ...question, text: e.target.value })} onBlur={() => setEdit(null)} onKeyDown={(e) => { if (e.key === "Enter") setEdit(null); }} className="w-full text-center font-bold text-lg rounded-lg px-2 py-1 mb-3 text-gray-900" />
      ) : (
        <p className="text-white font-bold text-center mb-3 cursor-text hover:bg-white/5 rounded" dir="auto" onDoubleClick={() => setEdit("title")}>{question.text || "Your question…"}</p>
      )}
      {type === "poll" || type === "multiple" ? (
        <div className="grid grid-cols-1 gap-2">
          {showOpts.map((o: string, i: number) => (
            edit === i ? (
              <input key={i} autoFocus dir="auto" value={opts[i] ?? ""} onChange={(e) => setOpt(i, e.target.value)} onBlur={() => setEdit(null)} onKeyDown={(e) => { if (e.key === "Enter") setEdit(null); }} className={editCls + " " + barColors[i % 6]} />
            ) : (
              <div key={i} className={"rounded-lg py-2 px-3 text-white text-sm font-bold cursor-text " + barColors[i % 6]} dir="auto" onDoubleClick={() => setEdit(i)}>{o || <span className="opacity-60">Option {i + 1}</span>}</div>
            )
          ))}
        </div>
      ) : type === "rating" ? (
        <div className="flex justify-center gap-1 text-4xl">{[1, 2, 3, 4, 5].map((s) => (<span key={s} className="opacity-40">⭐</span>))}</div>
      ) : type === "scale" ? (
        <div className="px-2">
          <div className="text-center text-3xl font-black text-kahoot-yellow mb-1">{Math.round((lo + hi) / 2)}</div>
          <input type="range" min={lo} max={hi} defaultValue={Math.round((lo + hi) / 2)} className="w-full" readOnly />
          <div className="flex justify-between text-white/60 text-xs mt-1">
            {edit === "smin" ? (<input autoFocus dir="auto" value={question.scaleMinLabel || ""} onChange={(e) => onChange({ ...question, scaleMinLabel: e.target.value })} onBlur={() => setEdit(null)} onKeyDown={(e) => { if (e.key === "Enter") setEdit(null); }} className="w-24 text-gray-900 rounded px-1" />) : (<span className="cursor-text hover:bg-white/10 rounded px-1" onDoubleClick={() => setEdit("smin")}>{question.scaleMinLabel || lo}</span>)}
            {edit === "smax" ? (<input autoFocus dir="auto" value={question.scaleMaxLabel || ""} onChange={(e) => onChange({ ...question, scaleMaxLabel: e.target.value })} onBlur={() => setEdit(null)} onKeyDown={(e) => { if (e.key === "Enter") setEdit(null); }} className="w-24 text-gray-900 rounded px-1 text-right" />) : (<span className="cursor-text hover:bg-white/10 rounded px-1" onDoubleClick={() => setEdit("smax")}>{question.scaleMaxLabel || hi}</span>)}
          </div>
        </div>
      ) : type === "wordcloud" ? (
        <div className="rounded-lg bg-white/10 text-white/50 text-sm py-3 px-3 text-center">Type a word…</div>
      ) : type === "openended" ? (
        <div className="rounded-lg bg-white/10 text-white/50 text-sm py-6 px-3">Type your answer…</div>
      ) : type === "ranking" ? (
        <div className="flex flex-col gap-2">
          {showOpts.map((o: string, i: number) => (
            edit === i ? (
              <input key={i} autoFocus dir="auto" value={opts[i] ?? ""} onChange={(e) => setOpt(i, e.target.value)} onBlur={() => setEdit(null)} onKeyDown={(e) => { if (e.key === "Enter") setEdit(null); }} className="rounded-lg py-2 px-3 text-gray-900 text-sm w-full" />
            ) : (
              <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg py-2 px-3 text-white text-sm cursor-text" onDoubleClick={() => setEdit(i)}><span className="opacity-60">≡</span><span dir="auto">{o || "Item " + (i + 1)}</span></div>
            )
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(opts.length ? opts : ["", "", "", ""]).map((o: string, i: number) => (<div key={i} className={"rounded-lg py-2 px-3 text-white text-sm font-bold " + barColors[i % 6]} dir="auto">{o || ("Answer " + (i + 1))}</div>))}
        </div>
      )}
    </div>
  );
}

function SortableQuestion({ question, index, onChange, onDelete, startExpanded, kind }: SortableQuestionProps) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(!!startExpanded);
  const [adv, setAdv] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border-2 border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span {...attributes} {...listeners} className="cursor-grab text-gray-400 text-xl select-none">⠿</span>
        <span className="w-7 h-7 bg-kahoot-purple text-white rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span>
        <span className="flex-1 font-semibold text-gray-700 truncate">{question.text || "Untitled question"}</span>
        <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-100 pt-4">
          <Input
            label={`Question (${question.text.length}/150)`}
            value={question.text}
            maxLength={150}
            dir="auto"
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder={t("Enter your question...")}
          />
          <button
            type="button"
            onClick={() => setAdv(!adv)}
            className="self-start text-sm font-semibold text-kahoot-purple"
          >
            {adv ? "- Hide advanced options" : "+ Advanced options (image, audio, video, timer, points)"}
          </button>
          {adv && (<>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">{t("Difficulty")}</label>
            <select value={question.difficulty || "medium"} onChange={(e) => onChange({ ...question, difficulty: e.target.value as any })} className="px-3 py-2 border-2 border-gray-200 rounded-xl">
              <option value="easy">{t("Easy")}</option>
              <option value="medium">{t("Medium")}</option>
              <option value="hard">{t("Hard")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">{t("Image (optional) — upload or paste a URL")}</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCompressed(file, (url) => onChange({ ...question, imageUrl: url }));
                  e.target.value = "";
                }}
                className="text-sm"
              />
              {question.imageUrl && (
                <>
                  <img src={question.imageUrl} alt="" className="h-12 rounded" />
                  <button type="button" onClick={() => onChange({ ...question, imageUrl: "" })} className="text-red-500 font-bold text-lg" title={t("Remove image")}>✕</button>
                </>
              )}
            </div>
            <Input
              value={question.imageUrl && question.imageUrl.startsWith("data:") ? "" : question.imageUrl || ""}
              onChange={(e) => onChange({ ...question, imageUrl: e.target.value })}
              placeholder={t("...or paste an image URL")}
            />
          </div>
          <Input
            label={t("Video (optional — YouTube or MP4 link)")}
            value={question.videoUrl || ""}
            onChange={(e) => onChange({ ...question, videoUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">{t("Audio (optional) — upload a clip or paste a URL")}</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 600 * 1024) {
                    alert(t("Audio file is too large (max 600 KB). Please use a shorter clip or paste a URL instead."));
                    e.target.value = "";
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => onChange({ ...question, audioUrl: String(reader.result || "") });
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
                className="text-sm"
              />
              {question.audioUrl && (
                <>
                  <audio src={question.audioUrl} controls className="h-8" />
                  <button type="button" onClick={() => onChange({ ...question, audioUrl: "" })} className="text-red-500 font-bold text-lg" title={t("Remove audio")}>✕</button>
                </>
              )}
            </div>
            <Input
              value={question.audioUrl && question.audioUrl.startsWith("data:") ? "" : question.audioUrl || ""}
              onChange={(e) => onChange({ ...question, audioUrl: e.target.value })}
              placeholder={t("...or paste an audio URL (.mp3)")}
            />
          </div>
          </>)}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">{t("Question type")}</label>
{kind === "poll" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([["poll", "📊", "Multiple Choice"], ["scale", "🎚️", "Scale"], ["rating", "⭐", "Star rating"], ["wordcloud", "☁️", "Word Cloud"], ["openended", "💬", "Open Ended"], ["ranking", "🔢", "Ranking"]] as string[][]).map((it) => (
                  <button key={it[0]} type="button" onClick={() => { const v = it[0] as any; if (v === "poll" || v === "ranking") onChange({ ...question, type: v, correctAnswer: 0 }); else if (v === "scale") onChange({ ...question, type: v, scaleMin: question.scaleMin ?? 0, scaleMax: question.scaleMax ?? 10 }); else onChange({ ...question, type: v }); }} className={"p-3 rounded-xl border-2 text-center transition-colors " + ((question.type || "multiple") === it[0] ? "border-kahoot-purple bg-kahoot-purple/10" : "border-gray-200 hover:border-gray-300")}>
                    <div className="text-2xl">{it[1]}</div>
                    <div className="text-xs font-bold text-gray-700 mt-1">{t(it[2])}</div>
                  </button>
                ))}
              </div>
            ) : (
              <select
              value={question.type || "multiple"}
              onChange={(e) => {
                const t = e.target.value as Question["type"];
                if (t === "truefalse") onChange({ ...question, type: t, options: ["True", "False"], correctAnswer: 0 });
                else if (t === "typeanswer") onChange({ ...question, type: t, correctText: question.correctText || "" });
                else if (t === "sorting" || t === "poll" || t === "ranking") onChange({ ...question, type: t, correctAnswer: 0 });
                else if (t === "wordcloud" || t === "openended" || t === "rating") onChange({ ...question, type: t });
                else onChange({ ...question, type: t, options: question.options.length === 4 ? question.options : ["", "", "", ""] });
              }}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl"
            >
              <option value="multiple">{t("Multiple choice")}</option>
              <option value="truefalse">{t("True / False")}</option>
              <option value="typeanswer">{t("Type answer")}</option>
              <option value="sorting">{t("Sorting (order matters)")}</option>
              <option value="poll">{t("Poll / vote (no points)")}</option>
              <option value="wordcloud">{t("☁️ Word cloud (survey)")}</option>
              <option value="openended">{t("💬 Open-ended (survey)")}</option>
              <option value="rating">{t("⭐ Rating 1–5 (survey)")}</option>
              <option value="ranking">{t("🔢 Ranking (survey)")}</option>
            </select>
            )}
          </div>
          {adv && (!question.type || question.type === "multiple") && (
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={!!question.multiSelect}
                onChange={(e) => {
                  const on = e.target.checked;
                  onChange({
                    ...question,
                    multiSelect: on,
                    correctAnswers: on ? (question.correctAnswers?.length ? question.correctAnswers : [question.correctAnswer]) : undefined,
                  });
                }}
                className="w-4 h-4"
              />
              {t("Allow multiple correct answers (players pick all that apply)")}
            </label>
          )}
          {question.type === "typeanswer" ? (
            <Input
              label={`Correct answer (${(question.correctText || "").length}/75)`}
              value={question.correctText || ""}
              maxLength={75}
              dir="auto"
              onChange={(e) => onChange({ ...question, correctText: e.target.value })}
              placeholder={t("e.g. Paris")}
            />
          ) : question.type === "scale" ? (
            <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-gray-600">{t("🎚️ Scale: participants pick a number on a slider; the host shows the live average. Set the range below.")}</p>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-gray-600">{t("Min")}</label><input type="number" value={question.scaleMin ?? 0} onChange={(e) => onChange({ ...question, scaleMin: Number(e.target.value) })} className="w-24 px-2 py-1 border-2 border-gray-200 rounded-lg" /></div>
                <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-gray-600">{t("Max")}</label><input type="number" value={question.scaleMax ?? 10} onChange={(e) => onChange({ ...question, scaleMax: Number(e.target.value) })} className="w-24 px-2 py-1 border-2 border-gray-200 rounded-lg" /></div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <input value={question.scaleMinLabel || ""} onChange={(e) => onChange({ ...question, scaleMinLabel: e.target.value })} placeholder={t("Low label (optional)")} className="flex-1 min-w-[130px] px-2 py-1 border-2 border-gray-200 rounded-lg text-sm" />
                <input value={question.scaleMaxLabel || ""} onChange={(e) => onChange({ ...question, scaleMaxLabel: e.target.value })} placeholder={t("High label (optional)")} className="flex-1 min-w-[130px] px-2 py-1 border-2 border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
          ) : (question.type === "wordcloud" || question.type === "openended" || question.type === "rating") ? (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              {question.type === "wordcloud" && "☁️ Word cloud: participants type words from their phones; the host screen shows a live cloud (bigger = more mentions). No options needed."}
              {question.type === "openended" && "💬 Open-ended: participants submit text answers shown live on a wall. No options needed."}
              {question.type === "rating" && "⭐ Rating: participants rate 1–5 stars; the host shows the live average. No options needed."}
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-start">
                {question.type === "sorting" || question.type === "poll" || question.type === "ranking" ? (
                  <span className="mt-7 w-6 h-6 rounded-full bg-kahoot-purple text-white text-xs flex items-center justify-center flex-shrink-0">{question.type === "sorting" || question.type === "ranking" ? i + 1 : "•"}</span>
                ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (question.multiSelect) {
                      const cur = question.correctAnswers?.length ? question.correctAnswers : [question.correctAnswer];
                      const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b);
                      onChange({ ...question, correctAnswers: next, correctAnswer: next[0] ?? 0 });
                    } else {
                      onChange({ ...question, correctAnswer: i, correctAnswers: [i] });
                    }
                  }}
                  className={cn(
                    "mt-7 w-6 h-6 border-2 flex-shrink-0 transition-colors",
                    question.multiSelect ? "rounded-md" : "rounded-full",
                    (question.multiSelect ? (question.correctAnswers?.length ? question.correctAnswers : [question.correctAnswer]).includes(i) : question.correctAnswer === i) ? "bg-kahoot-green border-kahoot-green" : "border-gray-300"
                  )}
                  title={t("Mark as correct")}
                />
                )}
                <Input
                  label={`${question.type === "sorting" ? "Item" : "Option"} ${i + 1} (${opt.length}/75)`}
                  value={opt}
                  maxLength={75}
                  dir="auto"
                  onChange={(e) => {
                    const opts = [...question.options];
                    opts[i] = e.target.value;
                    onChange({ ...question, options: opts });
                  }}
                  placeholder={`Answer ${i + 1}`}
                />
              </div>
            ))}
          </div>
          )}
          {(!question.type || question.type === "multiple" || question.type === "sorting" || question.type === "poll") && (
            <div className="flex gap-2">
              {question.options.length < 6 && (
                <Button variant="ghost" size="sm" onClick={() => onChange({ ...question, options: [...question.options, ""] })}>
                  + Add option ({question.options.length}/6)
                </Button>
              )}
              {question.options.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = question.options.slice(0, -1);
                    const lastIdx = next.length;
                    onChange({
                      ...question,
                      options: next,
                      correctAnswer: question.correctAnswer >= lastIdx ? 0 : question.correctAnswer,
                      correctAnswers: question.correctAnswers?.filter((x) => x < lastIdx),
                    });
                  }}
                >
                  {t("− Remove last")}
                </Button>
              )}
            </div>
          )}
          {kind === "poll" && <PollPreview question={question} onChange={onChange} />}
          <div className="flex gap-4">
            {adv && (<>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">{t("Time limit")}</label>
              <select
                value={question.timeLimit}
                onChange={(e) => onChange({ ...question, timeLimit: Number(e.target.value) })}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl"
              >
                {[5, 10, 20, 30, 45, 60, 90, 120, 180, 240].map((t) => (
                  <option key={t} value={t}>{t < 60 ? t + "s" : t / 60 + " min"}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">{t("Points")}</label>
              <select
                value={question.points}
                onChange={(e) => onChange({ ...question, points: Number(e.target.value) })}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl"
              >
                {[0, 500, 1000, 2000].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            </>)}
            <div className="flex-1" />
            <Button variant="danger" size="sm" onClick={onDelete} className="self-end">{t("Delete")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuizEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
  kind?: string;
}

export default function QuizEditor({ questions, onChange, kind }: QuizEditorProps) {
  const { t } = useLang();
  const initialIds = useRef<Set<string>>(new Set(questions.map((q) => q.id)));
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      onChange(arrayMove(questions, oldIndex, newIndex));
    }
  };

  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiLang, setAiLang] = useState<"en" | "ar">("en");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDoc, setAiDoc] = useState("");
  const [aiDocName, setAiDocName] = useState("");
  const [aiDocBusy, setAiDocBusy] = useState(false);
  const [aiUrl, setAiUrl] = useState("");

  const runAi = async () => {
    setAiLoading(true);
    setAiError("");
    if (!aiTopic.trim() && !aiDoc && !aiUrl.trim()) { setAiError(t("Enter a topic, a website URL, or upload a document.")); setAiLoading(false); return; }
    try {
      const qs = aiUrl.trim() ? await generateFromUrl(aiUrl.trim(), aiCount, aiLang, questions.map((q) => q.text).filter(Boolean)) : await generateQuestions(
        aiTopic.trim(),
        aiCount,
        aiLang,
        questions.map((q) => q.text).filter(Boolean),
        aiDoc
      );
      if (!qs.length) throw new Error("No new questions came back — they may all duplicate existing ones. Try a more specific topic.");
      onChange([...questions, ...qs]);
      setAiOpen(false);
      setAiTopic("");
      setAiDoc(""); setAiDocName(""); setAiUrl("");
    } catch (e: any) {
      setAiError(e?.message || "Generation failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const downloadTemplate = () => {
    const rows = [
      "type,question,option1,option2,option3,option4,correct,timeLimit,points",
      'multiple,"What is 2+2?","3","4","5","6",2,20,1000',
      'truefalse,"The sky is blue","True","False","","",1,10,500',
      'typeanswer,"Capital of France?","","","","","Paris",20,1000',
      'sorting,"Sort 1 to 4 (list options in the CORRECT order)","1","2","3","4","",30,1000',
      'poll,"Favourite colour?","Red","Blue","Green","Yellow","",15,0',
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quiz-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const errors: string[] = [];
      const imported: Question[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().startsWith("type,")) return;
        const c = parseCsvLine(line);
        const [type, qText, o1, o2, o3, o4, correct, tl, pts] = c;
        const rowNo = idx + 1;
        const validTypes = ["multiple", "truefalse", "typeanswer", "sorting", "poll"];
        let problem = "";
        if (!validTypes.includes(type)) problem = "unknown type '" + type + "'";
        else if (!qText) problem = "missing question text";
        const opts = [o1, o2, o3, o4].map((o) => o || "");
        const nonEmpty = opts.filter((o) => o.trim());
        if (!problem) {
          if (type === "multiple" && nonEmpty.length < 2) problem = "needs at least 2 options";
          else if (type === "multiple" && (!correct || isNaN(Number(correct)) || Number(correct) < 1 || Number(correct) > nonEmpty.length)) problem = "correct must be an option number (1-" + nonEmpty.length + ")";
          else if (type === "truefalse" && !["1", "2"].includes(correct || "")) problem = "correct must be 1 (True) or 2 (False)";
          else if (type === "typeanswer" && !correct) problem = "correct text answer is required";
          else if ((type === "sorting" || type === "poll") && nonEmpty.length < 2) problem = "needs at least 2 options";
        }
        const safeType = (validTypes.includes(type) ? type : "multiple") as Question["type"];
        const q: Question = {
          ...makeBlankQuestion(),
          type: safeType,
          text: problem ? "[FIX ME: " + problem + "] " + (qText || "") : qText,
          options: safeType === "truefalse" ? ["True", "False"] : opts,
          correctAnswer: safeType === "typeanswer" || safeType === "sorting" || safeType === "poll" ? 0 : Math.max(0, (Number(correct) || 1) - 1),
          ...(safeType === "typeanswer" ? { correctText: correct || "" } : {}),
          timeLimit: [5, 10, 20, 30, 60].includes(Number(tl)) ? Number(tl) : 20,
          points: [0, 500, 1000, 2000].includes(Number(pts)) ? Number(pts) : 1000,
        };
        if (problem) { errors.push("Row " + rowNo + ": " + problem); return; }
        imported.push(q);
      });
      setImportErrors(errors);
      if (imported.length) onChange([...questions, ...imported]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {questions.map((q, i) => (
            <SortableQuestion
              key={q.id}
              question={q}
              index={i}
              startExpanded={!initialIds.current.has(q.id)}
              onChange={(updated) => {
                const next = [...questions];
                next[i] = updated;
                onChange(next);
              }}
              onDelete={() => onChange(questions.filter((_, idx) => idx !== i))}
              kind={kind}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2 self-start">
        <Button variant="secondary" onClick={() => onChange([...questions, makeBlankQuestion()])}>
          {t("+ Add Question")}
        </Button>
        {kind !== "poll" && <Button onClick={() => setAiOpen(true)}>{t("✨ Generate with AI")}</Button>}
      </div>

      <div className="border-t border-gray-200 pt-4 mt-2 flex flex-col gap-2">
        <p className="font-semibold text-gray-700">📥 Bulk import questions (CSV)</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>{t("⬇️ Download template")}</Button>
          <input
            type="file"
            accept=".csv,text/csv"
            className="text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = "";
            }}
          />
        </div>
        {importErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <p className="font-bold mb-1">{t("⚠️ Some rows were skipped due to invalid data. Only valid rows were added — fix the rest in your file and re-import.")}</p>
            <ul className="list-disc pl-5">
              {importErrors.map((er, i) => (
                <li key={i}>{er}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {aiOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !aiLoading && setAiOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black mb-1">{t("✨ Generate questions with AI")}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("Describe a topic, or upload a document (PDF, Word, PowerPoint, text), and QuizUps will draft multiple-choice questions.")}</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">{t("Topic")}</label>
                <input
                  value={aiTopic}
                  dir="auto"
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder={t("e.g. World capitals, Photosynthesis, Ottoman history")}
                  className="px-3 py-2 border-2 border-gray-200 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">{t("Or generate from a document")}</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt"
                  onChange={async (ev) => {
                    const f = ev.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10 * 1024 * 1024) { setAiError(t("File too large (max 10MB).")); return; }
                    setAiDocBusy(true); setAiError("");
                    try {
                      const txt = await extractTextFromFile(f);
                      if (!txt.trim()) throw new Error("No readable text found in that file.");
                      setAiDoc(txt); setAiDocName(f.name);
                    } catch (err: any) {
                      setAiError(err?.message || "Could not read that file."); setAiDoc(""); setAiDocName("");
                    } finally { setAiDocBusy(false); }
                  }}
                  className="text-sm"
                />
                {aiDocBusy && <p className="text-xs text-gray-500">{t("Reading document…")}</p>}
                {aiDocName && !aiDocBusy && <p className="text-xs text-kahoot-green font-semibold">Loaded: {aiDocName} — questions will come from its content.</p>}
                <p className="text-xs text-gray-400">{t("PDF, Word, PowerPoint or text. Long files are trimmed to keep AI free.")}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">{t("Or generate from a website URL")}</label>
                <input value={aiUrl} onChange={(e) => setAiUrl(e.target.value)} placeholder="https://en.wikipedia.org/wiki/..." className="px-3 py-2 border-2 border-gray-200 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-semibold text-gray-700">{t("How many")}</label>
                  <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="px-3 py-2 border-2 border-gray-200 rounded-xl">
                    {[5, 10, 15, 20].map((n) => (<option key={n} value={n}>{n} questions</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-semibold text-gray-700">{t("Language")}</label>
                  <select value={aiLang} onChange={(e) => setAiLang(e.target.value as "en" | "ar")} className="px-3 py-2 border-2 border-gray-200 rounded-xl">
                    <option value="en">{t("English")}</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
              </div>
              {aiLoading && <AiProgress />}
              {aiError && <p className="text-red-500 text-sm">{aiError}</p>}
              <div className="flex gap-2 justify-end mt-1">
                <Button variant="ghost" onClick={() => setAiOpen(false)} disabled={aiLoading}>{t("Cancel")}</Button>
                <Button onClick={runAi} loading={aiLoading} disabled={!aiTopic.trim() && !aiDoc && !aiUrl.trim()}>{t("Generate")}</Button>
              </div>
              <p className="text-xs text-gray-400">{t("AI can make mistakes — review the questions before publishing.")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}