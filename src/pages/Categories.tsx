import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Icon } from '../components/ui';
import { CATEGORIES as DEFAULT_CATEGORIES, getCategorySpending } from '../data/mock';
import { formatCurrency, cn } from '../lib/utils';
import type { Category, TransactionType } from '../types';

const TYPE_SECTIONS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'Expense' },
  { type: 'income', label: 'Income' },
  { type: 'transfer', label: 'Transfer' },
];

const TYPE_ICON_STYLES: Record<TransactionType, { bg: string; text: string }> = {
  expense: { bg: 'bg-expense/10', text: 'text-expense' },
  income: { bg: 'bg-income/10', text: 'text-income' },
  transfer: { bg: 'bg-transfer/10', text: 'text-transfer' },
};

export function Categories() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const categorySpending = getCategorySpending();

  const getSpending = (categoryId: string) =>
    categorySpending.find((cs) => cs.category.id === categoryId);

  const handleDelete = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  const handleAdd = (type: TransactionType) => {
    const name = prompt(`New ${type} category name:`);
    if (!name?.trim()) return;

    const newCategory: Category = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      type,
      icon: type === 'expense' ? 'CircleDot' : type === 'income' ? 'CircleDot' : 'CircleDot',
      isDefault: false,
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  return (
    <div className="page-container">
      <PageHeader title="Categories">
        <button className="btn-primary" onClick={() => handleAdd('expense')}>
          <Plus size={16} />
          New Category
        </button>
      </PageHeader>

      {/* Spending Overview */}
      {categorySpending.length > 0 && (
        <section style={{ marginTop: '-32px', marginBottom: '16px' }}>
          <div className="section-header">
            <h2 className="section-title">Monthly Spending</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {categorySpending.map((cs) => (
              <div key={cs.category.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-(--radius-md) bg-surface flex items-center justify-center shrink-0">
                  <Icon name={cs.category.icon} size={16} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] text-text">{cs.category.name}</span>
                    <span
                      className="text-[13px] text-text-secondary"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {formatCurrency(cs.amount)}
                    </span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-text-secondary transition-[width] duration-400 ease-out"
                      style={{ width: `${cs.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] text-text-muted w-10 text-right shrink-0">
                  {cs.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Sections by Type */}
      {TYPE_SECTIONS.map(({ type, label }) => {
        const typeCats = categories.filter((c) => c.type === type);
        return (
          <section key={type}>
            <div className="section-header">
              <h2 className="section-title">{label}</h2>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-muted">{typeCats.length} categories</span>
                <button
                  onClick={() => handleAdd(type)}
                  className="section-action"
                >
                  <Plus size={10} /> Add
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {typeCats.map((cat) => {
                const spending = getSpending(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="group flex items-center gap-3 p-3.5 bg-surface rounded-(--radius-md) transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <div className={cn('w-8 h-8 rounded-(--radius-md) flex items-center justify-center shrink-0', TYPE_ICON_STYLES[cat.type].bg)}>
                      <Icon name={cat.icon} size={16} className={TYPE_ICON_STYLES[cat.type].text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-text">{cat.name}</div>
                      {spending ? (
                        <div className="text-[11px] text-text-muted">
                          {spending.transactionCount} transactions &middot; {formatCurrency(spending.amount)}
                        </div>
                      ) : (
                        <div className="text-[11px] text-text-muted capitalize">{type}</div>
                      )}
                    </div>
                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className={cn(
                          'w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-expense transition-opacity',
                          'opacity-0 group-hover:opacity-100',
                        )}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {typeCats.length === 0 && (
                <div className="col-span-full py-6 text-center text-[12px] text-text-muted">
                  No {label.toLowerCase()} categories yet.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
