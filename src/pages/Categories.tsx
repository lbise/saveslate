import { Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TagIcon } from '../components/ui';
import { TAGS, getTagSpending } from '../data/mock';
import { formatCurrency } from '../lib/utils';

export function Categories() {
  const tagSpending = getTagSpending();
  const expenseTags = TAGS.filter((t) => t.type === 'expense' && !t.goalId);
  const incomeTags = TAGS.filter((t) => t.type === 'income');
  const goalTags = TAGS.filter((t) => t.goalId);

  // Find spending data for a tag
  const getSpending = (tagId: string) =>
    tagSpending.find((ts) => ts.tag.id === tagId);

  return (
    <div className="page-container">
      <PageHeader title="Categories">
        <button className="btn-primary">
          <Plus size={16} />
          New Tag
        </button>
      </PageHeader>

      {/* Spending Overview */}
      {tagSpending.length > 0 && (
        <section style={{ marginTop: '-32px', marginBottom: '16px' }}>
          <div className="section-header">
            <h2 className="section-title">Monthly Spending</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {tagSpending.map((ts) => (
              <div key={ts.tag.id} className="flex items-center gap-3">
                <TagIcon icon={ts.tag.icon} color={ts.tag.color} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] text-text">{ts.tag.name}</span>
                    <span
                      className="text-[13px] text-text-secondary"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {formatCurrency(ts.amount)}
                    </span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-400 ease-out"
                      style={{
                        width: `${ts.percentage}%`,
                        backgroundColor: ts.tag.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[11px] text-text-muted w-10 text-right shrink-0">
                  {ts.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expense Tags */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Expense Tags</h2>
          <span className="text-[11px] text-text-muted">{expenseTags.length} tags</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {expenseTags.map((tag) => {
            const spending = getSpending(tag.id);
            return (
              <div
                key={tag.id}
                className="flex items-center gap-3 p-3.5 bg-surface rounded-(--radius-md) transition-colors duration-150 hover:bg-surface-hover cursor-pointer"
              >
                <TagIcon icon={tag.icon} color={tag.color} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text">{tag.name}</div>
                  {spending ? (
                    <div className="text-[11px] text-text-muted">
                      {spending.transactionCount} transactions &middot; {formatCurrency(spending.amount)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-text-muted">No spending this month</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Income Tags */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Income Tags</h2>
          <span className="text-[11px] text-text-muted">{incomeTags.length} tags</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {incomeTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 p-3.5 bg-surface rounded-(--radius-md) transition-colors duration-150 hover:bg-surface-hover cursor-pointer"
            >
              <TagIcon icon={tag.icon} color={tag.color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text">{tag.name}</div>
                <div className="text-[11px] text-text-muted capitalize">{tag.type}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Goal Tags */}
      {goalTags.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Goal Tags</h2>
            <span className="text-[11px] text-text-muted">{goalTags.length} tags</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {goalTags.map((tag) => {
              const spending = getSpending(tag.id);
              return (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3.5 bg-surface rounded-(--radius-md) transition-colors duration-150 hover:bg-surface-hover cursor-pointer"
                >
                  <TagIcon icon={tag.icon} color={tag.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text">{tag.name}</div>
                    {spending ? (
                      <div className="text-[11px] text-text-muted">
                        {spending.transactionCount} contributions &middot; {formatCurrency(spending.amount)}
                      </div>
                    ) : (
                      <div className="text-[11px] text-text-muted">Linked to goal</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
