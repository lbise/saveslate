import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-h-16 rounded-md border border-border bg-card px-4 py-2.5",
        "text-base text-foreground placeholder:text-dimmed",
        "focus:outline-none focus:ring-1 focus:ring-dimmed focus:border-dimmed",
        "transition-all duration-150 resize-y",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "leading-5",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
