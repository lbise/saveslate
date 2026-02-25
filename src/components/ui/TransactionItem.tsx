import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { cn, formatSignedCurrency, resolveTransferFlowAccounts } from '../../lib/utils';
import type { TransactionType } from '../../types';

interface TransactionItemProps {
  description: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  categoryName: string;
  accountName?: string;
  destinationAccountName?: string;
  transferPairRole?: 'source' | 'destination';
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

function getAmountColorClass(type: TransactionType, amount: number): string {
  if (type !== 'transfer') {
    return amountColors[type];
  }
  if (amount > 0) {
    return 'text-income';
  }
  if (amount < 0) {
    return 'text-expense';
  }
  return 'text-text';
}

export function TransactionItem({
  description,
  type,
  amount,
  currency = 'CHF',
  categoryName,
  accountName,
  destinationAccountName,
  transferPairRole,
  goalName,
  isSplit,
}: TransactionItemProps) {
  const TxIcon = typeIcons[type];

  const transferFlow = type === 'transfer' && accountName && destinationAccountName
    ? resolveTransferFlowAccounts({
        amount,
        accountName,
        counterpartyAccountName: destinationAccountName,
        transferPairRole,
      })
    : null;

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-border last:border-b-0 transition-opacity duration-150 hover:opacity-80">
      {/* Icon */}
      <div className={cn('w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0', iconBoxStyles[type])}>
        <TxIcon size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-body text-text truncate" title={description}>{description}</div>
        <div className="text-ui text-text-muted flex items-center gap-2">
          <span>{categoryName}</span>
          {transferFlow && (
            <span className="text-text-secondary">
              &middot; {transferFlow.fromAccountName} &rarr; {transferFlow.toAccountName}
            </span>
          )}
          {goalName && <span className="text-text-secondary">&middot; {goalName}</span>}
          {isSplit && <span className="text-text-secondary">&middot; Split</span>}
        </div>
      </div>

      {/* Amount */}
      <div
        className={cn('text-body font-medium shrink-0', getAmountColorClass(type, amount))}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {formatSignedCurrency(amount, currency)}
      </div>
    </div>
  );
}
