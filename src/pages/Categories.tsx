import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Pencil, Search, Trash2, X } from 'lucide-react';
import { PageHeader, PageHeaderActions } from '../components/layout';
import { Icon, Modal } from '../components/ui';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/mock';
import { cn } from '../lib/utils';
import type { Category, TransactionType } from '../types';

const TYPE_SECTIONS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'Expense' },
  { type: 'income', label: 'Income' },
  { type: 'transfer', label: 'Transfer' },
];

const FORM_TYPE_OPTIONS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'Expense' },
  { type: 'income', label: 'Income' },
];

const LOCKED_CATEGORY_IDS = new Set(['transfer']);

const TYPE_ICON_STYLES: Record<TransactionType, { bg: string; text: string }> = {
  expense: { bg: 'bg-expense/10', text: 'text-expense' },
  income: { bg: 'bg-income/10', text: 'text-income' },
  transfer: { bg: 'bg-transfer/10', text: 'text-transfer' },
};

interface ExportedCategoriesFile {
  schemaVersion: number;
  exportedAt: string;
  categoryCount: number;
  categories: Category[];
}

const CATEGORIES_EXPORT_SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTransactionType(value: unknown): value is TransactionType {
  return value === 'expense' || value === 'income' || value === 'transfer';
}

function parseImportedCategory(entry: unknown, index: number): Category {
  if (!isRecord(entry)) {
    throw new Error(`Category #${index + 1} is invalid.`);
  }

  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (!name) {
    throw new Error(`Category #${index + 1} is missing a name.`);
  }

  if (!isTransactionType(entry.type)) {
    throw new Error(`Category #${index + 1} has an invalid type.`);
  }

  const icon = typeof entry.icon === 'string' && entry.icon.trim().length > 0
    ? entry.icon.trim()
    : 'CircleDot';

  return {
    id: typeof entry.id === 'string' ? entry.id.trim() : '',
    name,
    type: entry.type,
    icon,
    isDefault: false,
  };
}

function parseImportedCategories(rawContent: string): Category[] {
  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(rawContent) as unknown;
  } catch {
    throw new Error('Invalid JSON file.');
  }

  if (!Array.isArray(parsedContent) && !isRecord(parsedContent)) {
    throw new Error('Invalid categories file format.');
  }

  if (
    isRecord(parsedContent)
    && 'schemaVersion' in parsedContent
    && parsedContent.schemaVersion !== CATEGORIES_EXPORT_SCHEMA_VERSION
  ) {
    throw new Error('Unsupported categories file version.');
  }

  const rawCategories = Array.isArray(parsedContent)
    ? parsedContent
    : parsedContent.categories;

  if (!Array.isArray(rawCategories)) {
    throw new Error('Categories file is missing a categories array.');
  }

  const importedCategories = rawCategories.map((category, index) => parseImportedCategory(category, index));
  if (importedCategories.length === 0) {
    throw new Error('No categories found in file.');
  }

  return importedCategories;
}

function createUniqueCategoryId(existingIds: Set<string>): string {
  let candidate = '';
  do {
    candidate = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export function Categories() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [form, setForm] = useState<{ name: string; type: TransactionType; icon: string }>({
    name: '',
    type: 'expense',
    icon: 'CircleDot',
  });
  const importInputRef = useRef<HTMLInputElement>(null);

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
    setEditingCategoryId(null);
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    if (LOCKED_CATEGORY_IDS.has(category.id)) {
      return;
    }

    setForm({ name: category.name, type: category.type, icon: category.icon });
    setEditingCategoryId(category.id);
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
    setIsCreateModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategoryId(null);
    setIsIconPickerOpen(false);
  };

  const handleDelete = (categoryId: string) => {
    if (LOCKED_CATEGORY_IDS.has(categoryId)) {
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  const handleCreateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const categoryName = form.name.trim();
    if (!categoryName) return;

    if (editingCategoryId) {
      setCategories((prev) => prev.map((category) => (
        category.id === editingCategoryId
          ? {
            ...category,
            name: categoryName,
            type: form.type,
            icon: form.icon,
          }
          : category
      )));
      closeModal();
      return;
    }

    const newCategory: Category = {
      id: `custom-${Date.now()}`,
      name: categoryName,
      type: form.type,
      icon: form.icon,
      isDefault: false,
    };

    setCategories((prev) => [...prev, newCategory]);
    closeModal();
  };

  const handleOpenImportPicker = () => {
    setImportError(null);
    importInputRef.current?.click();
  };

  const handleExportCategories = () => {
    if (categories.length === 0) {
      return;
    }

    const exportPayload: ExportedCategoriesFile = {
      schemaVersion: CATEGORIES_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      categoryCount: categories.length,
      categories,
    };

    const fileDate = new Date().toISOString().split('T')[0];
    const fileName = `melomoney-categories-${fileDate}.json`;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImportCategoriesFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const fileContent = await file.text();
      const importedCategories = parseImportedCategories(fileContent);

      setCategories((previousCategories) => {
        const existingCategoryIds = new Set(previousCategories.map((category) => category.id));

        return [
          ...previousCategories,
          ...importedCategories.map((category) => {
            const nextId = category.id && !existingCategoryIds.has(category.id)
              ? category.id
              : createUniqueCategoryId(existingCategoryIds);

            existingCategoryIds.add(nextId);

            if (nextId === category.id) {
              return category;
            }

            return {
              ...category,
              id: nextId,
            };
          }),
        ];
      });
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import categories file.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Categories">
        <PageHeaderActions
          onImport={handleOpenImportPicker}
          onExport={handleExportCategories}
          onCreate={() => openCreateModal('expense')}
          importDisabled={isImporting}
          exportDisabled={categories.length === 0}
          importLabel={isImporting ? 'Importing...' : 'Import'}
        />
      </PageHeader>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImportCategoriesFile(event);
        }}
        className="hidden"
      />

      {importError && (
        <p className="text-ui text-expense mb-3">{importError}</p>
      )}

      {isCreateModalOpen && (
        <Modal onClose={closeModal} panelClassName="max-w-xl p-5">
          <section>
              <div className="section-header mb-4">
                <h2 className="heading-3 text-text">
                  {editingCategoryId ? 'Edit Category' : 'Create Category'}
                </h2>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={closeModal}
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
                      {FORM_TYPE_OPTIONS.map(({ type, label }) => (
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
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingCategoryId ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
          </section>
        </Modal>
      )}

      {/* Category Sections by Type */}
      {TYPE_SECTIONS.map(({ type, label }) => {
        const typeCats = categories.filter((c) => c.type === type);
        return (
          <section key={type}>
            <div className="section-header">
              <h2 className="section-title">{label}</h2>
              <span className="text-ui text-text-muted">{typeCats.length} categories</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {typeCats.map((cat) => {
                const isLocked = LOCKED_CATEGORY_IDS.has(cat.id);
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
                    </div>
                    <div className="flex items-center gap-1">
                      {!isLocked && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            className={cn(
                              'w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-expense transition-opacity',
                              'opacity-0 group-hover:opacity-100',
                            )}
                            title={`Edit category ${cat.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id)}
                            className={cn(
                              'w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-expense transition-opacity',
                              'opacity-0 group-hover:opacity-100',
                            )}
                            title={`Delete category ${cat.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
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
