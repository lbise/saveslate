import { useState, useEffect, useRef } from 'react';
import { Search, Check } from 'lucide-react';
import { Icon } from './Icon';
import { cn } from '../../lib/utils';
import { CATEGORIES, CATEGORY_GROUPS } from '../../lib/data-service';

interface CategoryPickerProps {
  currentCategoryId: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  openUpward?: boolean;
  className?: string;
}

export function CategoryPicker({
  currentCategoryId,
  onSelect,
  onClose,
  openUpward = false,
  className,
}: CategoryPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const normalizedQuery = query.trim().toLowerCase();

  const groupedCategories = [...CATEGORY_GROUPS]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((group) => {
      const categories = CATEGORIES
        .filter((category) => category.groupId === group.id)
        .filter((category) => {
          if (!normalizedQuery) {
            return true;
          }
          return category.name.toLowerCase().includes(normalizedQuery);
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        group,
        categories,
      };
    })
    .filter((entry) => entry.categories.length > 0);

  const knownGroupIds = new Set(CATEGORY_GROUPS.map((group) => group.id));
  const ungroupedCategories = CATEGORIES
    .filter((category) => !category.groupId || !knownGroupIds.has(category.groupId))
    .filter((category) => {
      if (!normalizedQuery) {
        return true;
      }
      return category.name.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (ungroupedCategories.length > 0) {
    groupedCategories.push({
      group: { id: 'ungrouped', name: 'Ungrouped', icon: 'Folder', order: Number.MAX_SAFE_INTEGER },
      categories: ungroupedCategories,
    });
  }

  const hasAnyCategory = groupedCategories.some((entry) => entry.categories.length > 0);

  return (
    <div
      className={cn(
        'absolute left-0 z-30 w-52 bg-surface border border-border rounded-(--radius-md) py-1 shadow-(--shadow-md)',
        openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
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
          className="w-full pl-7 pr-2 py-1.5 rounded-(--radius-sm) bg-bg border border-border text-ui text-text placeholder:text-text-muted focus:outline-none focus:border-text-muted transition-colors"
        />
      </div>

      {/* Category list — grouped by CategoryGroup */}
      <div className="max-h-64 overflow-y-auto py-1">
        {!hasAnyCategory ? (
          <div className="px-3 py-3 text-ui text-text-muted text-center">
            No categories found
          </div>
        ) : (
          groupedCategories.map(({ group, categories }) => (
            <div key={group.id} className="py-1">
              <div className="px-3 py-1 text-ui text-text-muted uppercase tracking-wider">
                {group.name}
              </div>
              {categories.map((cat) => {
                const isCurrent = cat.id === currentCategoryId;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelect(cat.id)}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3 py-1.5 text-left border-none cursor-pointer text-ui transition-colors',
                      isCurrent
                        ? 'bg-text/10 text-text'
                        : 'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    <Icon
                      name={cat.icon}
                      size={14}
                      className={cn('text-text-secondary', isCurrent ? 'opacity-100' : 'opacity-60')}
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
