import { useMemo, useState, type FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Plus, Search, Trash2, X } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Icon } from '../components/ui';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/mock';
import { cn } from '../lib/utils';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [form, setForm] = useState<{ name: string; type: TransactionType; icon: string }>({
    name: '',
    type: 'expense',
    icon: 'CircleDot',
  });

  const allIconNames = useMemo(
    () => Object.keys(LucideIcons.icons).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filteredIconNames = useMemo(() => {
    const query = iconSearchQuery.trim().toLowerCase();
    if (!query) return allIconNames;
    return allIconNames.filter((iconName) => iconName.toLowerCase().includes(query));
  }, [allIconNames, iconSearchQuery]);

  const openCreateModal = (type: TransactionType) => {
    setForm({ name: '', type, icon: 'CircleDot' });
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  const handleCreateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const categoryName = form.name.trim();
    if (!categoryName) return;

    const newCategory: Category = {
      id: `custom-${Date.now()}`,
      name: categoryName,
      type: form.type,
      icon: form.icon,
      isDefault: false,
    };

    setCategories((prev) => [...prev, newCategory]);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="page-container">
      <PageHeader title="Categories">
        <button className="btn-primary" onClick={() => openCreateModal('expense')}>
          <Plus size={16} />
          New Category
        </button>
      </PageHeader>

      {isCreateModalOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-bg/70"
            onClick={() => {
              setIsCreateModalOpen(false);
              setIsIconPickerOpen(false);
            }}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <section className="card w-full max-w-xl p-5">
              <div className="section-header mb-4">
                <h2 className="heading-3 text-text">Create Category</h2>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsIconPickerOpen(false);
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateCategory}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label mb-1.5 block" htmlFor="category-name">Name</label>
                    <input
                      id="category-name"
                      className="input"
                      placeholder="Groceries"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="label mb-1.5 block" htmlFor="category-type">Type</label>
                    <select
                      id="category-type"
                      className="select"
                      value={form.type}
                      onChange={(event) => {
                        const type = event.target.value as TransactionType;
                        setForm((current) => ({ ...current, type }));
                      }}
                    >
                      {TYPE_SECTIONS.map(({ type, label }) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <label className="label mb-1.5 block" htmlFor="category-icon-search">Icon</label>
                  <button
                    type="button"
                    className="input flex items-center justify-between"
                    onClick={() => setIsIconPickerOpen((current) => !current)}
                    aria-expanded={isIconPickerOpen}
                    aria-controls="category-icon-picker"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon name={form.icon} size={16} className="text-text" />
                      <span className="text-body text-text truncate">{form.icon}</span>
                    </span>
                    <ChevronDown size={16} className="text-text-muted" />
                  </button>

                  {isIconPickerOpen && (
                    <div id="category-icon-picker" className="card absolute z-20 mt-2 w-full p-3">
                      <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          id="category-icon-search"
                          className="input pl-9"
                          placeholder="Search icon"
                          value={iconSearchQuery}
                          onChange={(event) => setIconSearchQuery(event.target.value)}
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto rounded-(--radius-md) border border-border">
                        {filteredIconNames.map((iconName) => {
                          const isSelected = form.icon === iconName;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => {
                                setForm((current) => ({ ...current, icon: iconName }));
                                setIsIconPickerOpen(false);
                              }}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-left border-none bg-transparent',
                                'transition-colors duration-150',
                                isSelected
                                  ? 'bg-surface-hover text-text'
                                  : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                              )}
                            >
                              <Icon name={iconName} size={16} />
                              <span className="text-ui">{iconName}</span>
                            </button>
                          );
                        })}

                        {filteredIconNames.length === 0 && (
                          <div className="px-3 py-4 text-ui text-text-muted">No icons found.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setIsIconPickerOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Category
                  </button>
                </div>
              </form>
            </section>
          </div>
        </>
      )}

      {/* Category Sections by Type */}
      {TYPE_SECTIONS.map(({ type, label }) => {
        const typeCats = categories.filter((c) => c.type === type);
        return (
          <section key={type}>
            <div className="section-header">
              <h2 className="section-title">{label}</h2>
              <div className="flex items-center gap-3">
                <span className="text-ui text-text-muted">{typeCats.length} categories</span>
                <button
                  onClick={() => openCreateModal(type)}
                  className="section-action"
                >
                  <Plus size={10} /> Add
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {typeCats.map((cat) => {
                return (
                  <div
                    key={cat.id}
                    className="group flex items-center gap-3 p-3.5 bg-surface rounded-(--radius-md) transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <div className={cn('w-8 h-8 rounded-(--radius-md) flex items-center justify-center shrink-0', TYPE_ICON_STYLES[cat.type].bg)}>
                      <Icon name={cat.icon} size={16} className={TYPE_ICON_STYLES[cat.type].text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-body text-text">{cat.name}</div>
                      <div className="text-ui text-text-muted capitalize">{type}</div>
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
                <div className="col-span-full py-6 text-center text-ui text-text-muted">
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
