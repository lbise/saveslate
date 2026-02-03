import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--color-bg-card)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-border)]',
        'shadow-[var(--shadow-sm)]',
        'transition-all duration-200',
        hover && 'hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent)] cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'px-5 py-4 border-b border-[var(--color-border-light)]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold text-[var(--color-text-primary)]',
        className
      )}
    >
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
