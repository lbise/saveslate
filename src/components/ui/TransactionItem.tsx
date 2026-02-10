import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TransactionType } from '../../types';

interface TransactionItemProps {
  description: string;
  type: TransactionType;
  amount: string;
  categoryName: string;
  goalName?: string;
  isSplit?: boolean;
}

const typeIcons = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
};

const iconBoxStyles = {
  income: 'bg-income/10 text-income',
  expense: 'bg-expense/10 text-expense',
  transfer: 'bg-transfer/10 text-transfer',
};

const amountColors = {
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-text',
};

const amountPrefix = {
  income: '+',
  expense: '-',
  transfer: '',
};

export function TransactionItem({ description, type, amount, categoryName, goalName, isSplit }: TransactionItemProps) {
  const TxIcon = typeIcons[type];

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-border last:border-b-0 transition-opacity duration-150 hover:opacity-80">
      {/* Icon */}
      <div className={cn('w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0', iconBoxStyles[type])}>
        <TxIcon size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-text truncate" title={description}>{description}</div>
        <div className="text-[11px] text-text-muted flex items-center gap-2">
          <span>{categoryName}</span>
          {goalName && <span className="text-text-secondary">&middot; {goalName}</span>}
          {isSplit && <span className="text-text-secondary">&middot; Split</span>}
        </div>
      </div>

      {/* Amount */}
      <div
        className={cn('text-[13px] font-medium shrink-0', amountColors[type])}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {amountPrefix[type]}{amount}
      </div>
    </div>
  );
}
