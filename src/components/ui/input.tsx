import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "h-10 w-full min-w-0 rounded-md border border-border bg-card px-4",
          "text-base text-foreground placeholder:text-dimmed",
          "focus:outline-none focus:ring-1 focus:ring-dimmed focus:border-dimmed",
          "transition-all duration-150",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          "leading-[1.2]",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
