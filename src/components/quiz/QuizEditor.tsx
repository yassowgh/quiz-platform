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
            label="Question"
            value={question.text}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder="Enter your question..."
          />
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-start">
                <button
                  type="button"
                  onClick={() => onChange({ ...question, correctAnswer: i })}
                  className={cn(
                    "mt-7 w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors",
                    question.correctAnswer === i ? "bg-kahoot-green border-kahoot-green" : "border-gray-300"
                  )}
                  title="Mark as correct"
                />
                <Input
                  label={`Option ${i + 1}`}
                  value={opt}
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
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Time limit</label>
              <select
                value={question.timeLimit}
                onChange={(e) => onChange({ ...question, timeLimit: Number(e.target.value) })}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl"
              >
                {[5, 10, 20, 30, 60, 90, 120].map((t) => (
                  <option key={t} value={t}>{t}s</option>
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
                {[500, 1000, 2000].map((p) => (
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
    </div>
  );
}