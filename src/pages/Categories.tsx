import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Pencil, Search, Trash2 } from 'lucide-react';
import { PageHeader, PageHeaderActions } from '../components/layout';
import {
  DeleteConfirmationModal,
  EntityCard,
  EntityCardOverflowMenu,
  Icon,
} from '../components/ui';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      toast.success(`${imported.categories.length} categories imported`);
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
    toast.success("Category deleted");
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
      toast.success("Category updated");
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
    toast.success("Category created");
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
    toast.success("Categories exported");
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
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
        <p className="text-sm text-expense mb-3">{importError}</p>
      )}

      {categoryToDelete && (
        <DeleteConfirmationModal
          title="Delete category?"
          description={(
            <>
              This will permanently delete <span className="text-foreground">{categoryToDelete.name}</span>.
            </>
          )}
          confirmLabel="Delete category"
          onConfirm={handleConfirmDeleteCategory}
          onClose={() => setCategoryToDelete(null)}
        />
      )}

      {isCreateModalOpen && (
        <Dialog open onOpenChange={(open) => { if (!open) closeModal(); }}>
          <DialogContent className="max-w-xl" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {editingCategoryId ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
            </DialogHeader>

              <form className="space-y-4" onSubmit={handleCreateCategory}>
                <div>
                  <Label className="mb-1.5 block" htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    placeholder="Groceries"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </div>

                <div className="relative">
                  <Label className="mb-1.5 block" htmlFor="category-group">Group</Label>
                  <Select
                    value={form.groupId}
                    onValueChange={(value) => {
                      setForm((current) => ({ ...current, groupId: value }));
                    }}
                  >
                    <SelectTrigger id="category-group">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderedGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Label className="mb-1.5 block" htmlFor="category-icon-search">Icon</Label>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full h-10 rounded-md border border-border bg-card px-4 text-base text-foreground transition-all duration-150 cursor-pointer"
                    onClick={() => iconPicker.setIsIconPickerOpen((current) => !current)}
                    aria-expanded={iconPicker.isIconPickerOpen}
                    aria-controls="category-icon-picker"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon name={form.icon} size={16} className="text-foreground" />
                      <span className="text-base text-foreground truncate">{form.icon}</span>
                    </span>
                    <ChevronDown size={16} className="text-dimmed" />
                  </button>

                  {iconPicker.isIconPickerOpen && (
                    <Card id="category-icon-picker" className="absolute z-20 mt-2 w-full p-3">
                      <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dimmed" />
                        <Input
                          id="category-icon-search"
                          className="pl-9"
                          placeholder="Search icon"
                          value={iconPicker.iconSearchQuery}
                          onChange={(event) => iconPicker.setIconSearchQuery(event.target.value)}
                        />
                      </div>

                      <ScrollArea className="max-h-64 rounded-(--radius-md) border border-border">
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
                                  ? 'bg-secondary text-foreground'
                                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                              )}
                            >
                              <Icon name={iconName} size={16} />
                              <span className="text-sm text-muted-foreground">{iconName}</span>
                            </button>
                          );
                        })}

                        {iconPicker.filteredIconNames.length === 0 && (
                          <div className="px-3 py-4 text-sm text-dimmed">No icons found.</div>
                        )}
                      </ScrollArea>
                    </Card>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCategoryId ? 'Save Changes' : 'Create Category'}
                  </Button>
                </DialogFooter>
              </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Categories grouped by CategoryGroup */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-medium text-muted-foreground">Category Groups</h2>
          <span className="text-sm text-dimmed">{categories.length} categories</span>
        </div>

        <div className="space-y-4">
          {groupedCategories.map((group) => (
            <Card
              key={group.id}
              className="p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="w-9 h-9 rounded-(--radius-md) flex items-center justify-center shrink-0 bg-foreground/10 text-muted-foreground">
                    <Icon name={group.icon} size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-medium text-foreground">{group.name}</h3>
                    <p className="text-sm text-dimmed">{group.categories.length} categories</p>
                  </div>
                </div>

                <Badge variant="muted" className="shrink-0">
                  {group.categories.length}
                </Badge>
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
                          ? <Badge variant="muted">Locked</Badge>
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
            </Card>
          ))}
          {groupedCategories.length === 0 && (
            <div className="col-span-full py-6 text-center text-sm text-dimmed">
              No categories yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
