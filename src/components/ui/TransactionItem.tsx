import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TransactionItemProps {
  description: string;
  type: 'income' | 'expense';
  amount: string;
  tagName: string;
  isSplit?: boolean;
}

export function TransactionItem({ description, type, amount, tagName, isSplit }: TransactionItemProps) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-border last:border-b-0 transition-opacity duration-150 hover:opacity-80">
      {/* Icon */}
      <div
        className="w-[34px] h-[34px] rounded-(--radius-md) bg-surface flex items-center justify-center shrink-0 text-text-secondary"
      >
        {type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
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
          type === 'income' ? 'text-income' : 'text-expense',
        )}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {type === 'income' ? '+' : '-'}{amount}
      </div>
    </div>
  );
}
