"use client";
import { useState } from "react";
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
import type { Question } from "@/types";
import { makeBlankQuestion } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";

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
  question: Question;
  index: number;
  onChange: (q: Question) => void;
  onDelete: () => void;
}

function SortableQuestion({ question, index, onChange, onDelete }: SortableQuestionProps) {
  const [expanded, setExpanded] = useState(false);
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
            placeholder="Enter your question..."
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Image (optional) — upload or paste a URL</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) compressImageToDataUrl(file, (url) => onChange({ ...question, imageUrl: url }));
                  e.target.value = "";
                }}
                className="text-sm"
              />
              {question.imageUrl && (
                <>
                  <img src={question.imageUrl} alt="" className="h-12 rounded" />
                  <button type="button" onClick={() => onChange({ ...question, imageUrl: "" })} className="text-red-500 font-bold text-lg" title="Remove image">✕</button>
                </>
              )}
            </div>
            <Input
              value={question.imageUrl && question.imageUrl.startsWith("data:") ? "" : question.imageUrl || ""}
              onChange={(e) => onChange({ ...question, imageUrl: e.target.value })}
              placeholder="...or paste an image URL"
            />
          </div>
          <Input
            label="Video (optional — YouTube or MP4 link)"
            value={question.videoUrl || ""}
            onChange={(e) => onChange({ ...question, videoUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Audio (optional) — upload a clip or paste a URL</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 600 * 1024) {
                    alert("Audio file is too large (max 600 KB). Please use a shorter clip or paste a URL instead.");
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
                  <button type="button" onClick={() => onChange({ ...question, audioUrl: "" })} className="text-red-500 font-bold text-lg" title="Remove audio">✕</button>
                </>
              )}
            </div>
            <Input
              value={question.audioUrl && question.audioUrl.startsWith("data:") ? "" : question.audioUrl || ""}
              onChange={(e) => onChange({ ...question, audioUrl: e.target.value })}
              placeholder="...or paste an audio URL (.mp3)"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Question type</label>
            <select
              value={question.type || "multiple"}
              onChange={(e) => {
                const t = e.target.value as Question["type"];
                if (t === "truefalse") onChange({ ...question, type: t, options: ["True", "False"], correctAnswer: 0 });
                else if (t === "typeanswer") onChange({ ...question, type: t, correctText: question.correctText || "" });
                else if (t === "sorting" || t === "poll") onChange({ ...question, type: t, correctAnswer: 0 });
                else onChange({ ...question, type: t, options: question.options.length === 4 ? question.options : ["", "", "", ""] });
              }}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl"
            >
              <option value="multiple">Multiple choice</option>
              <option value="truefalse">True / False</option>
              <option value="typeanswer">Type answer</option>
              <option value="sorting">Sorting (order matters)</option>
              <option value="poll">Poll / vote (no points)</option>
            </select>
          </div>
          {(!question.type || question.type === "multiple") && (
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
              Allow multiple correct answers (players pick all that apply)
            </label>
          )}
          {question.type === "typeanswer" ? (
            <Input
              label={`Correct answer (${(question.correctText || "").length}/75)`}
              value={question.correctText || ""}
              maxLength={75}
              dir="auto"
              onChange={(e) => onChange({ ...question, correctText: e.target.value })}
              placeholder="e.g. Paris"
            />
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-start">
                {question.type === "sorting" || question.type === "poll" ? (
                  <span className="mt-7 w-6 h-6 rounded-full bg-kahoot-purple text-white text-xs flex items-center justify-center flex-shrink-0">{question.type === "sorting" ? i + 1 : "•"}</span>
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
                  title="Mark as correct"
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
                  − Remove last
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Time limit</label>
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
              <label className="text-sm font-semibold text-gray-700">Points</label>
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
            <div className="flex-1" />
            <Button variant="danger" size="sm" onClick={onDelete} className="self-end">Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuizEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export default function QuizEditor({ questions, onChange }: QuizEditorProps) {
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
        if (problem) errors.push("Row " + rowNo + ": " + problem);
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
              onChange={(updated) => {
                const next = [...questions];
                next[i] = updated;
                onChange(next);
              }}
              onDelete={() => onChange(questions.filter((_, idx) => idx !== i))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        variant="secondary"
        onClick={() => onChange([...questions, makeBlankQuestion()])}
        className="self-start"
      >
        + Add Question
      </Button>

      <div className="border-t border-gray-200 pt-4 mt-2 flex flex-col gap-2">
        <p className="font-semibold text-gray-700">📥 Bulk import questions (CSV)</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>⬇️ Download template</Button>
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
            <p className="font-bold mb-1">⚠️ Some rows had problems — they were imported marked with [FIX ME]. Edit or delete them:</p>
            <ul className="list-disc pl-5">
              {importErrors.map((er, i) => (
                <li key={i}>{er}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}