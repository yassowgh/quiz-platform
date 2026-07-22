import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-kahoot-purple text-white hover:bg-purple-800 shadow-lg",
      secondary: "bg-white text-kahoot-purple border-2 border-kahoot-purple hover:bg-purple-50",
      danger: "bg-kahoot-red text-white hover:bg-red-700 shadow-lg",
      ghost: "bg-transparent text-gray-700 border border-gray-200 hover:bg-gray-100",
    };
    const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-6 py-3 text-base", lg: "px-8 py-4 text-xl" };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
        {loading ? <span className="animate-spin mr-2">⟳</span> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export default Button;