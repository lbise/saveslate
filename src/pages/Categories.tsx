import { useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, Pencil, Search, Trash2, X } from 'lucide-react';
import { PageHeader, PageHeaderActions } from '../components/layout';
import {
  DeleteConfirmationModal,
  EntityCard,
  EntityCardOverflowMenu,
  Icon,
  Modal,
} from '../components/ui';
import type { EntityCardTone } from '../components/ui';
import {
  CATEGORIES as DEFAULT_CATEGORIES,
  CATEGORY_GROUPS as DEFAULT_CATEGORY_GROUPS,
} from '../lib/data-service';
import { cn } from '../lib/utils';
import { useImportExport, useIconPicker } from '../hooks';
import type { Category, CategoryGroup } from '../types';

const LOCKED_CATEGORY_IDS = new Set(['transfer']);
const UNGROUPED_CATEGORY_GROUP_ID = 'ungrouped';

const GROUP_ENTITY_TONES: Record<string, EntityCardTone> = {
  living: 'accent',
  lifestyle: 'goal',
  finance: 'warning',
  income: 'income',
  transfers: 'transfer',
  [UNGROUPED_CATEGORY_GROUP_ID]: 'neutral',
};

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
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [form, setForm] = useState<{ name: string; icon: string; groupId: string }>({
    name: '',
    icon: 'CircleDot',
    groupId: DEFAULT_CATEGORY_GROUPS[0]?.id ?? UNGROUPED_CATEGORY_GROUP_ID,
  });

  const iconPicker = useIconPicker();
  const { importError, isImporting, importInputRef, openFilePicker, handleFileChange, exportJsonFile } = useImportExport<{ categories: Category[]; categoryGroups: CategoryGroup[] }>({
    parseFile: parseImportedCategories,
    onImportSuccess: (imported) => {
      setCategories((previousCategories) => {
        const existingCategoryIds = new Set(previousCategories.map((category) => category.id));

        return [
          ...previousCategories,
          ...imported.categories.map((category) => {
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
    },
  });

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
    iconPicker.setIconSearchQuery('');
    iconPicker.setIsIconPickerOpen(false);
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
    iconPicker.setIconSearchQuery('');
    iconPicker.setIsIconPickerOpen(false);
    setIsCreateModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategoryId(null);
    iconPicker.setIsIconPickerOpen(false);
  };

  const handleDelete = (categoryId: string) => {
    if (LOCKED_CATEGORY_IDS.has(categoryId)) {
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  const requestDeleteCategory = (category: Category) => {
    if (LOCKED_CATEGORY_IDS.has(category.id)) {
      return;
    }

    setCategoryToDelete(category);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) {
      return;
    }

    handleDelete(categoryToDelete.id);
    if (editingCategoryId === categoryToDelete.id) {
      closeModal();
    }
    setCategoryToDelete(null);
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
    exportJsonFile(`saveslate-categories-${fileDate}.json`, exportPayload);
  };

  return (
    <div className="page-container">
      <PageHeader title="Categories">
        <PageHeaderActions
          onImport={openFilePicker}
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
          void handleFileChange(event);
        }}
        className="hidden"
      />

      {importError && (
        <p className="text-ui text-expense mb-3">{importError}</p>
      )}

      {categoryToDelete && (
        <DeleteConfirmationModal
          title="Delete category?"
          description={(
            <>
              This will permanently delete <span className="text-text">{categoryToDelete.name}</span>.
            </>
          )}
          confirmLabel="Delete category"
          onConfirm={handleConfirmDeleteCategory}
          onClose={() => setCategoryToDelete(null)}
        />
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
                    onClick={() => iconPicker.setIsIconPickerOpen((current) => !current)}
                    aria-expanded={iconPicker.isIconPickerOpen}
                    aria-controls="category-icon-picker"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon name={form.icon} size={16} className="text-text" />
                      <span className="text-body text-text truncate">{form.icon}</span>
                    </span>
                    <ChevronDown size={16} className="text-text-muted" />
                  </button>

                  {iconPicker.isIconPickerOpen && (
                    <div id="category-icon-picker" className="card absolute z-20 mt-2 w-full p-3">
                      <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          id="category-icon-search"
                          className="input pl-9"
                          placeholder="Search icon"
                          value={iconPicker.iconSearchQuery}
                          onChange={(event) => iconPicker.setIconSearchQuery(event.target.value)}
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto rounded-(--radius-md) border border-border">
                        {iconPicker.filteredIconNames.map((iconName) => {
                          const isSelected = form.icon === iconName;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => {
                                setForm((current) => ({ ...current, icon: iconName }));
                                iconPicker.setIsIconPickerOpen(false);
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

                        {iconPicker.filteredIconNames.length === 0 && (
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
              className="card p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="w-9 h-9 rounded-(--radius-md) flex items-center justify-center shrink-0 bg-text/10 text-text-secondary">
                    <Icon name={group.icon} size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="heading-3 text-text">{group.name}</h3>
                    <p className="text-ui text-text-muted">{group.categories.length} categories</p>
                  </div>
                </div>

                <span className="badge-muted shrink-0">
                  {group.categories.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.categories.map((cat) => {
                  const isLocked = LOCKED_CATEGORY_IDS.has(cat.id);
                  const entityTone = GROUP_ENTITY_TONES[group.id] ?? 'neutral';

                  return (
                    <EntityCard
                      key={cat.id}
                      icon={cat.icon}
                      title={cat.name}
                      tone={entityTone}
                      actions={
                        isLocked
                          ? <span className="badge-muted">Locked</span>
                          : (
                            <EntityCardOverflowMenu
                              label={`Actions for ${cat.name}`}
                              actions={[
                                { label: 'Edit', icon: Pencil, onClick: () => openEditModal(cat) },
                                { label: 'Delete', icon: Trash2, onClick: () => requestDeleteCategory(cat), tone: 'danger' },
                              ]}
                            />
                          )
                      }
                    />
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
