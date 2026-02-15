import { useState, useEffect, useRef } from 'react';
import { Search, Check } from 'lucide-react';
import { Icon } from './Icon';
import { cn } from '../../lib/utils';
import { CATEGORIES } from '../../data/mock';
import type { Category, TransactionType } from '../../types';

interface CategoryPickerProps {
  currentCategoryId: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  className?: string;
}

const TYPE_ORDER: TransactionType[] = ['expense', 'income', 'transfer'];

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
};

const TYPE_COLORS: Record<TransactionType, string> = {
  expense: 'text-expense',
  income: 'text-income',
  transfer: 'text-transfer',
};

const TYPE_BG_COLORS: Record<TransactionType, string> = {
  expense: 'bg-expense/10',
  income: 'bg-income/10',
  transfer: 'bg-transfer/10',
};

export function CategoryPicker({
  currentCategoryId,
  onSelect,
  onClose,
  className,
}: CategoryPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus search on open
  useEffect(() => {
    // Small delay to avoid the click that opened the picker from stealing focus
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Filter categories by search query
  const filtered = query
    ? CATEGORIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : CATEGORIES;

  // Group by type, preserving order
  const grouped = TYPE_ORDER.reduce<{ type: TransactionType; categories: Category[] }[]>(
    (acc, type) => {
      const cats = filtered.filter((c) => c.type === type);
      if (cats.length > 0) {
        acc.push({ type, categories: cats });
      }
      return acc;
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute z-30 w-52 bg-surface border border-border rounded-(--radius-md) py-1 shadow-(--shadow-md)',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="relative px-2 py-1.5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-7 pr-2 py-1.5 rounded-(--radius-sm) bg-bg border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-text-muted transition-colors"
        />
      </div>

      {/* Category list */}
      <div className="max-h-64 overflow-y-auto py-1">
        {grouped.length === 0 ? (
          <div className="px-3 py-3 text-ui text-text-muted text-center">
            No categories found
          </div>
        ) : (
          grouped.map(({ type, categories }) => (
            <div key={type}>
              {/* Section header */}
              <div
                className={cn(
                  'px-3 pt-2.5 pb-1 text-ui font-medium uppercase tracking-wider',
                  TYPE_COLORS[type],
                )}
              >
                {TYPE_LABELS[type]}
              </div>

              {/* Items */}
              {categories.map((cat) => {
                const isCurrent = cat.id === currentCategoryId;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelect(cat.id)}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3 py-1.5 text-left border-none cursor-pointer text-ui transition-colors',
                      isCurrent
                        ? `${TYPE_BG_COLORS[type]} ${TYPE_COLORS[type]}`
                        : 'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    <Icon
                      name={cat.icon}
                      size={14}
                      className={cn(TYPE_COLORS[type], isCurrent ? 'opacity-100' : 'opacity-60')}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    {isCurrent && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
