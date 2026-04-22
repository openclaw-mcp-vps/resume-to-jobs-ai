import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#f0f6fc] outline-none placeholder:text-[#8b949e] focus:ring-2 focus:ring-[#2f81f7]/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
