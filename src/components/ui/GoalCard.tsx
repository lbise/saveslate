import { Card } from './Card';
import { Progress } from './progress';
import { cn } from '../../lib/utils';
import { useFormatCurrency } from '../../hooks';

interface GoalCardProps {
  name: string;
  percentage: number;
  currentAmount: number;
  targetAmount: number;
}

export function GoalCard({ name, percentage, currentAmount, targetAmount }: GoalCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const progressValue = Math.max(0, Math.min(percentage, 100));

  return (
    <Card className="p-4 transition-colors duration-150 hover:bg-secondary cursor-pointer">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-medium text-foreground">{name}</span>
        <span
          className="text-base text-muted-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <Progress
        value={progressValue}
        className="h-1 bg-border mb-2.5"
        indicatorClassName="bg-foreground"
      />

      {/* Amounts */}
      <div className="flex justify-between text-sm text-dimmed">
        <span className={cn(currentAmount < 0 && 'text-expense')}>{formatCurrency(currentAmount)}</span>
        <span>{formatCurrency(targetAmount)}</span>
      </div>
    </Card>
  );
}
