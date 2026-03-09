import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary",
        income: "bg-income/15 text-income",
        expense: "bg-expense/15 text-expense",
        transfer: "bg-transfer/15 text-transfer",
        split: "bg-split/15 text-split",
        muted: "bg-border text-dimmed",
        destructive: "bg-destructive/15 text-destructive",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  color?: string
}

function Badge({ className, variant, color, style, ...props }: BadgeProps) {
  if (color) {
    return (
      <span
        data-slot="badge"
        className={cn(badgeVariants({ variant: undefined }), className)}
        style={{
          backgroundColor: `${color}20`,
          color: color,
          ...style,
        }}
        {...props}
      />
    )
  }

  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      style={style}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
