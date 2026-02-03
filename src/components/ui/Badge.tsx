import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "income" | "expense" | "muted";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  color?: string; // Custom color override
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-accent-bg)] text-[var(--color-accent)]",
  income: "bg-[var(--color-income-bg)] text-[var(--color-income)]",
  expense: "bg-[var(--color-expense-bg)] text-[var(--color-expense)]",
  muted: "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]",
};

export function Badge({
  children,
  variant = "default",
  className,
  color,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-xs font-medium",
        !color && variantStyles[variant],
        className,
      )}
      style={
        color
          ? {
              backgroundColor: `${color}20`,
              color: color,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
