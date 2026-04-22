import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-[#2f81f7] text-white hover:bg-[#3f8cff] border border-[#2f81f7] disabled:bg-[#2f81f799]",
  secondary:
    "bg-[#161b22] text-[#f0f6fc] hover:bg-[#1f2733] border border-[#30363d]",
  ghost: "bg-transparent text-[#c9d1d9] hover:bg-[#161b22] border border-transparent",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
          variantStyles[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
