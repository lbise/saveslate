import { Target, Plus, Calendar } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Icon, TransactionItem } from '../components/ui';
import {
  getGoalProgress,
  getTransactionsWithDetails,
} from '../data/mock';
import { formatCurrency, formatDate } from '../lib/utils';

export function Goals() {
  const goals = getGoalProgress();
  const allTransactions = getTransactionsWithDetails();

  return (
    <div className="page-container">
      <PageHeader title="Goals">
        <button className="btn-primary">
          <Plus size={16} />
          New Goal
        </button>
      </PageHeader>

      {/* Goals overview */}
      <div className="flex flex-wrap gap-8 mb-2" style={{ marginTop: '-32px' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-text-secondary" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {goals.length}
            </span>
            <span className="text-xs text-text-muted">Active Goals</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-income" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0))}
            </span>
            <span className="text-xs text-text-muted">Total Saved</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-text-muted" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatCurrency(goals.reduce((sum, g) => sum + g.goal.targetAmount, 0))}
            </span>
            <span className="text-xs text-text-muted">Total Target</span>
          </div>
        </div>
      </div>

      {/* Goal Cards */}
      <div className="flex flex-col gap-4">
        {goals.map((gp) => {
          // Get transactions directly linked to this goal
          const goalTransactions = allTransactions
            .filter((tx) => tx.goalId === gp.goal.id)
            .slice(0, 4);

          return (
            <div
              key={gp.goal.id}
              className="p-5 bg-surface rounded-(--radius-lg)"
            >
              {/* Goal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-(--radius-md) flex items-center justify-center"
                    style={{ backgroundColor: `${gp.goal.color}20` }}
                  >
                    <Icon name={gp.goal.icon} size={20} style={{ color: gp.goal.color }} />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-text">{gp.goal.name}</div>
                    {gp.goal.deadline && (
                      <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                        <Calendar size={10} />
                        <span>Due {formatDate(gp.goal.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-lg font-medium text-text"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {gp.percentage.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-[width] duration-400 ease-out"
                  style={{ width: `${gp.percentage}%`, backgroundColor: gp.goal.color }}
                />
              </div>

              {/* Amounts */}
              <div className="flex justify-between text-[12px] mb-5">
                <span className="text-text-secondary">
                  {formatCurrency(gp.currentAmount)} saved
                </span>
                <span className="text-text-muted">
                  of {formatCurrency(gp.goal.targetAmount)}
                </span>
              </div>

              {/* Linked Transactions */}
              {goalTransactions.length > 0 && (
                <div className="border-t border-border pt-4">
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-3">
                    Recent Contributions
                  </div>
                  <div className="flex flex-col">
                    {goalTransactions.map((tx) => (
                      <TransactionItem
                        key={tx.id}
                        description={tx.description}
                        type={tx.category.type}
                        amount={formatCurrency(tx.amount)}
                        categoryName={tx.category.name}
                        isSplit={!!tx.split}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-surface rounded-(--radius-lg) flex items-center justify-center mb-4">
            <Target size={24} className="text-text-muted" />
          </div>
          <div className="text-sm text-text-secondary mb-1">No goals yet</div>
          <div className="text-[12px] text-text-muted">
            Create your first savings goal to get started.
          </div>
        </div>
      )}
    </div>
  );
}
