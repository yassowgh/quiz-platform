"use client";
import { cn } from "@/lib/utils";
import { ANSWER_COLORS } from "@/types";

interface AnswerButtonProps {
  index: number;
  text: string;
  selected?: boolean;
  correct?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function AnswerButton({ index, text, selected, correct, disabled, onClick }: AnswerButtonProps) {
  const color = ANSWER_COLORS[index];
  return (
    <button
      dir="auto"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl text-left font-bold text-lg w-full transition-all shadow-md",
        color.bg, color.text,
        "hover:brightness-110 active:scale-95",
        disabled && "cursor-default",
        selected && !correct && "ring-4 ring-white/50",
        correct && "ring-4 ring-white brightness-110 scale-105",
        selected && !correct && disabled && "opacity-90"
      )}
    >
      <span className="text-2xl w-8 text-center">{color.shape}</span>
      <span className="flex-1">{text}</span>
      {correct && <span className="text-2xl">✓</span>}
      {selected && !correct && disabled && <span className="text-2xl">✗</span>}
    </button>
  );
}