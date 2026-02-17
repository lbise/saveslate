import { formatCurrency } from '../../lib/utils';

interface GoalCardProps {
  name: string;
  percentage: number;
  currentAmount: number;
  targetAmount: number;
}

export function GoalCard({ name, percentage, currentAmount, targetAmount }: GoalCardProps) {
  const progressWidth = Math.max(0, Math.min(percentage, 100));

  return (
    <div className="p-4 bg-surface rounded-(--radius-lg) transition-colors duration-150 hover:bg-surface-hover cursor-pointer">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-body font-medium text-text">{name}</span>
        <span
          className="text-body"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border rounded-full overflow-hidden mb-2.5">
        <div
          className="h-full bg-text rounded-full transition-[width] duration-400 ease-out"
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {/* Amounts */}
      <div className="flex justify-between text-ui text-text-muted">
        <span className={currentAmount < 0 ? 'text-expense' : undefined}>{formatCurrency(currentAmount)}</span>
        <span>{formatCurrency(targetAmount)}</span>
      </div>
    </div>
  );
}
