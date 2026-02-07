import { ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TransactionType } from '../../types';

const TYPE_ICON_CLASS: Record<TransactionType, string> = {
  income: 'text-income bg-income/10',
  expense: 'text-expense bg-expense/10',
  transfer: 'text-transfer bg-transfer/10',
};

const TYPE_ICON: Record<TransactionType, React.ReactNode> = {
  income: <ArrowUpRight size={16} />,
  expense: <ArrowDownRight size={16} />,
  transfer: <ArrowRightLeft size={16} />,
};

interface TransactionItemProps {
  description: string;
  type: TransactionType;
  amount: string;
  tagName: string;
  isSplit?: boolean;
}

export function TransactionItem({ description, type, amount, tagName, isSplit }: TransactionItemProps) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-border last:border-b-0 transition-opacity duration-150 hover:opacity-80">
      {/* Icon */}
      <div
        className={cn("w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0", TYPE_ICON_CLASS[type])}
      >
        {TYPE_ICON[type]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-text truncate">{description}</div>
        <div className="text-[11px] text-text-muted flex items-center gap-2">
          <span>{tagName}</span>
          {isSplit && <span className="text-text-secondary">&middot; Split</span>}
        </div>
      </div>

      {/* Amount */}
      <div
        className={cn(
          'text-[13px] font-medium shrink-0',
          type === 'income' ? 'text-income' : type === 'transfer' ? 'text-transfer' : 'text-expense',
        )}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {type === 'income' ? '+' : type === 'transfer' ? '' : '-'}{amount}
      </div>
    </div>
  );
}
