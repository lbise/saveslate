import { Split, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SplitStatus } from '../../types';

interface SplitBadgeProps {
  status: SplitStatus;
  className?: string;
}

export function SplitBadge({ status, className }: SplitBadgeProps) {
  const isPending = status === 'pending';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        isPending
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        className
      )}
    >
      {isPending ? (
        <Split className="w-3 h-3" />
      ) : (
        <CheckCircle className="w-3 h-3" />
      )}
      <span>{isPending ? 'Split' : 'Reimbursed'}</span>
    </div>
  );
}
