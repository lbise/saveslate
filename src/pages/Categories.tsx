import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Pencil, Search, Trash2, X } from 'lucide-react';
import { PageHeader, PageHeaderActions } from '../components/layout';
import { Icon, Modal } from '../components/ui';
import {
  CATEGORIES as DEFAULT_CATEGORIES,
  CATEGORY_GROUPS as DEFAULT_CATEGORY_GROUPS,
} from '../lib/data-service';
import { cn } from '../lib/utils';
import type { Category, CategoryGroup } from '../types';

const LOCKED_CATEGORY_IDS = new Set(['transfer']);
const UNGROUPED_CATEGORY_GROUP_ID = 'ungrouped';

interface GroupTone {
  shell: string;
  icon: string;
  badge: string;
  categoryIcon: string;
  categoryCard: string;
}

const GROUP_TONES: Record<string, GroupTone> = {
  living: {
    shell: 'border-accent/25 bg-accent/8',
    icon: 'bg-accent/18 text-accent',
    badge: 'bg-accent/16 text-accent border-accent/30',
    categoryIcon: 'bg-accent/14 text-accent',
    categoryCard: 'border-accent/20 bg-bg/45 hover:border-accent/35 hover:bg-accent/10',
  },
  lifestyle: {
    shell: 'border-goal/25 bg-goal/8',
    icon: 'bg-goal/18 text-goal',
    badge: 'bg-goal/16 text-goal border-goal/30',
    categoryIcon: 'bg-goal/14 text-goal',
    categoryCard: 'border-goal/20 bg-bg/45 hover:border-goal/35 hover:bg-goal/10',
  },
  finance: {
    shell: 'border-warning/30 bg-warning/10',
    icon: 'bg-warning/20 text-warning',
    badge: 'bg-warning/16 text-warning border-warning/35',
    categoryIcon: 'bg-warning/16 text-warning',
    categoryCard: 'border-warning/22 bg-bg/45 hover:border-warning/36 hover:bg-warning/10',
  },
  income: {
    shell: 'border-income/25 bg-income/8',
    icon: 'bg-income/18 text-income',
    badge: 'bg-income/16 text-income border-income/30',
    categoryIcon: 'bg-income/14 text-income',
    categoryCard: 'border-income/20 bg-bg/45 hover:border-income/35 hover:bg-income/10',
  },
  transfers: {
    shell: 'border-transfer/25 bg-transfer/10',
    icon: 'bg-transfer/18 text-transfer',
    badge: 'bg-transfer/16 text-transfer border-transfer/30',
    categoryIcon: 'bg-transfer/14 text-transfer',
    categoryCard: 'border-transfer/20 bg-bg/45 hover:border-transfer/35 hover:bg-transfer/10',
  },
  [UNGROUPED_CATEGORY_GROUP_ID]: {
    shell: 'border-border bg-surface/80',
    icon: 'bg-text/10 text-text-secondary',
    badge: 'bg-border text-text-secondary border-border',
    categoryIcon: 'bg-text/10 text-text-secondary',
    categoryCard: 'border-border bg-bg/45 hover:border-text-muted/50 hover:bg-surface-hover/45',
  },
};

const DEFAULT_GROUP_TONE = GROUP_TONES[UNGROUPED_CATEGORY_GROUP_ID];

interface ExportedCategoriesFile {
  schemaVersion: number;
  exportedAt: string;
  categoryCount: number;
  categoryGroupCount: number;
  categoryGroups: CategoryGroup[];
  categories: Category[];
}

const CATEGORIES_EXPORT_SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseImportedCategory(entry: unknown, index: number): Category {
  if (!isRecord(entry)) {
    throw new Error(`Category #${index + 1} is invalid.`);
  }

  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (!name) {
    throw new Error(`Category #${index + 1} is missing a name.`);
  }

  const icon = typeof entry.icon === 'string' && entry.icon.trim().length > 0
    ? entry.icon.trim()
    : 'CircleDot';

  return {
    id: typeof entry.id === 'string' ? entry.id.trim() : '',
    name,
    icon,
    groupId: typeof entry.groupId === 'string' && entry.groupId.trim().length > 0
      ? entry.groupId.trim()
      : undefined,
    isDefault: false,
  };
}

function parseImportedCategoryGroup(entry: unknown, index: number): CategoryGroup {
  if (!isRecord(entry)) {
    throw new Error(`Category group #${index + 1} is invalid.`);
  }

  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (!name) {
    throw new Error(`Category group #${index + 1} is missing a name.`);
  }

  return {
    id: typeof entry.id === 'string' && entry.id.trim().length > 0
      ? entry.id.trim()
      : `group-${Date.now()}-${index}`,
    name,
    icon: typeof entry.icon === 'string' && entry.icon.trim().length > 0
      ? entry.icon.trim()
      : 'Folder',
    order: typeof entry.order === 'number' && Number.isFinite(entry.order)
      ? entry.order
      : index + 1,
    isDefault: false,
  };
}

function parseImportedCategories(rawContent: string): {
  categories: Category[];
  categoryGroups: CategoryGroup[];
} {
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

  const rawCategoryGroups = isRecord(parsedContent) && Array.isArray(parsedContent.categoryGroups)
    ? parsedContent.categoryGroups
    : [];

  const importedCategoryGroups = rawCategoryGroups.map((group, index) => parseImportedCategoryGroup(group, index));

  return {
    categories: importedCategories,
    categoryGroups: importedCategoryGroups,
  };
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
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>(DEFAULT_CATEGORY_GROUPS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [form, setForm] = useState<{ name: string; icon: string; groupId: string }>({
    name: '',
    icon: 'CircleDot',
    groupId: DEFAULT_CATEGORY_GROUPS[0]?.id ?? UNGROUPED_CATEGORY_GROUP_ID,
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

  const orderedGroups = useMemo(
    () => [...categoryGroups].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [categoryGroups],
  );

  const groupedCategories = useMemo(() => {
    const groups = orderedGroups.map((group) => ({
      id: group.id,
      name: group.name,
      icon: group.icon,
      categories: [] as Category[],
    }));

    const byGroupId = new Map(groups.map((group) => [group.id, group] as const));
    const ungrouped: Category[] = [];

    [...categories]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((category) => {
        if (category.groupId && byGroupId.has(category.groupId)) {
          byGroupId.get(category.groupId)!.categories.push(category);
        } else {
          ungrouped.push(category);
        }
      });

    if (ungrouped.length > 0) {
      groups.push({
        id: UNGROUPED_CATEGORY_GROUP_ID,
        name: 'Ungrouped',
        icon: 'FolderOpen',
        categories: ungrouped,
      });
    }

    return groups.filter((group) => group.categories.length > 0);
  }, [categories, orderedGroups]);

  const openCreateModal = () => {
    setForm({
      name: '',
      icon: 'CircleDot',
      groupId: orderedGroups[0]?.id ?? UNGROUPED_CATEGORY_GROUP_ID,
    });
    setEditingCategoryId(null);
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    if (LOCKED_CATEGORY_IDS.has(category.id)) {
      return;
    }

    setForm({
      name: category.name,
      icon: category.icon,
      groupId: category.groupId ?? orderedGroups[0]?.id ?? UNGROUPED_CATEGORY_GROUP_ID,
    });
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
            icon: form.icon,
            groupId: form.groupId,
          }
          : category
      )));
      closeModal();
      return;
    }

    const newCategory: Category = {
      id: `custom-${Date.now()}`,
      name: categoryName,
      icon: form.icon,
      groupId: form.groupId,
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
      categoryGroupCount: categoryGroups.length,
      categoryGroups,
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
      const imported = parseImportedCategories(fileContent);
      const importedCategories = imported.categories;

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

      if (imported.categoryGroups.length > 0) {
        setCategoryGroups((previousGroups) => {
          const existingGroupIds = new Set(previousGroups.map((group) => group.id));
          const nextGroups = [...previousGroups];

          imported.categoryGroups.forEach((group) => {
            const nextId = group.id && !existingGroupIds.has(group.id)
              ? group.id
              : `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            existingGroupIds.add(nextId);
            nextGroups.push({
              ...group,
              id: nextId,
              order: nextGroups.length + 1,
            });
          });

          return nextGroups;
        });
      }
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
          onCreate={openCreateModal}
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

                <div className="relative">
                  <label className="label mb-1.5 block" htmlFor="category-group">Group</label>
                  <select
                    id="category-group"
                    className="select"
                    value={form.groupId}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, groupId: event.target.value }));
                    }}
                  >
                    {orderedGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
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

      {/* Categories grouped by CategoryGroup */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Category Groups</h2>
          <span className="text-ui text-text-muted">{categories.length} categories</span>
        </div>

        <div className="space-y-4">
          {groupedCategories.map((group) => (
            <section
              key={group.id}
              className={cn(
                'card p-4 sm:p-5',
                (GROUP_TONES[group.id] ?? DEFAULT_GROUP_TONE).shell,
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-(--radius-md) flex items-center justify-center shrink-0',
                      (GROUP_TONES[group.id] ?? DEFAULT_GROUP_TONE).icon,
                    )}
                  >
                    <Icon name={group.icon} size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="heading-3 text-text">{group.name}</h3>
                    <p className="text-ui text-text-muted">{group.categories.length} categories</p>
                  </div>
                </div>

                <span
                  className={cn(
                    'badge border shrink-0',
                    (GROUP_TONES[group.id] ?? DEFAULT_GROUP_TONE).badge,
                  )}
                >
                  {group.categories.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.categories.map((cat) => {
                  const isLocked = LOCKED_CATEGORY_IDS.has(cat.id);
                  const groupTone = GROUP_TONES[group.id] ?? DEFAULT_GROUP_TONE;

                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        'group flex items-center gap-3 p-3.5 rounded-(--radius-md) border transition-colors duration-150',
                        groupTone.categoryCard,
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-(--radius-md) flex items-center justify-center shrink-0',
                          groupTone.categoryIcon,
                        )}
                      >
                        <Icon name={cat.icon} size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-body text-text truncate">{cat.name}</div>
                        <div className="text-ui text-text-muted">
                          {cat.isDefault ? 'Default category' : 'Custom category'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isLocked && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(cat)}
                              className={cn(
                                'w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-opacity',
                                'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
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
                                'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                              )}
                              title={`Delete category ${cat.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                        {isLocked && <span className="badge-muted">Locked</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {groupedCategories.length === 0 && (
            <div className="col-span-full py-6 text-center text-ui text-text-muted">
              No categories yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
