import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export default function Card({ className, glass, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl shadow-xl p-6",
        glass ? "bg-white/10 backdrop-blur-md border border-white/20" : "bg-white",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}