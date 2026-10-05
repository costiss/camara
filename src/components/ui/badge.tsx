import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/types";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-line-2 bg-panel-2 text-fg-2",
        accent: "border-accent/30 bg-accent-dim text-accent",
        success: "border-green/25 bg-green/10 text-green",
        danger: "border-red/25 bg-red/10 text-red",
        warning: "border-yellow/25 bg-yellow/10 text-yellow",
        info: "border-blue/25 bg-blue/10 text-blue",
      } satisfies Record<StatusTone, string>,
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
