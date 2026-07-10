import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-sm font-semibold text-gray-700">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={cn(
          "w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-kahoot-purple focus:outline-none transition-colors text-gray-900",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
export default Input;