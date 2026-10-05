import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-line-2 bg-panel-2 text-fg-2",
        accent: "border-accent/30 bg-accent-dim text-accent",
        success: "border-green/30 bg-green/10 text-green",
        danger: "border-red/30 bg-red/10 text-red",
        info: "border-blue/30 bg-blue/10 text-blue",
        warning: "border-yellow/30 bg-yellow/10 text-yellow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
