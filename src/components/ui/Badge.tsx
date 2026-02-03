import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'income' | 'expense' | 'muted';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  color?: string; // Custom color override for category colors
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'badge-accent',
  income: 'badge-income',
  expense: 'badge-expense',
  muted: 'badge-muted',
};

export function Badge({
  children,
  variant = 'default',
  className,
  color,
}: BadgeProps) {
  // If custom color is provided, use inline styles
  if (color) {
    return (
      <span
        className={cn('badge', className)}
        style={{
          backgroundColor: `${color}20`,
          color: color,
        }}
      >
        {children}
      </span>
    );
  }

  // Use CSS component classes for standard variants
  return (
    <span className={cn(variantClasses[variant], className)}>
      {children}
    </span>
  );
}
