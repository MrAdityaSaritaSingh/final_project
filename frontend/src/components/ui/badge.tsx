import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../utils/cn"

const badgeVariants = cva(
  "inline-flex items-center border border-border bg-background px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-on-primary pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary",
        secondary: "text-on-secondary-container pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-secondary-container",
        destructive: "text-error pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-error",
        warning: "text-warning pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-warning",
        success: "text-success pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-success",
        outline: "text-on-surface",
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
