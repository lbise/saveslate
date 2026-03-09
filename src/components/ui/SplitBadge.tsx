import { Split, CheckCircle } from 'lucide-react';
import { Badge } from './Badge';
import type { SplitStatus } from '../../types';

interface SplitBadgeProps {
  status: SplitStatus;
  className?: string;
}

export function SplitBadge({ status, className }: SplitBadgeProps) {
  const isPending = status === 'pending';

  return (
    <Badge variant={isPending ? 'split' : 'income'} className={className}>
      {isPending ? (
        <Split className="w-3 h-3" />
      ) : (
        <CheckCircle className="w-3 h-3" />
      )}
      <span>{isPending ? 'Split' : 'Reimbursed'}</span>
    </Badge>
  );
}
