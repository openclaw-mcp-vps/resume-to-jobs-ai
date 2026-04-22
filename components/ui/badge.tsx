import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full border border-[#30363d] bg-[#161b22] px-2.5 py-1 text-xs font-medium text-[#c9d1d9]",
      className,
    )}
    {...props}
  />
);

export { Badge };
