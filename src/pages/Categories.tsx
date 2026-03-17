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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EntityCardTone } from '../components/ui';
import { cn } from '../lib/utils';
import { useImportExport, useIconPicker, useOnboarding } from '../hooks';
import { EntityListSkeleton, QueryError } from '../components/layout';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCategoryGroups,
  useCreateCategoryGroup,
  useDeleteCategoryGroup,
  useUpdateCategoryGroup,
} from '../hooks/api';
import type { Category, CategoryGroup, TransactionType } from '../types';

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

const CATEGORY_TYPE_TONES: Record<TransactionType, EntityCardTone> = {
  expense: 'expense',
  income: 'income',
  transfer: 'transfer',
};

const CATEGORY_TYPE_OPTIONS: Array<{
  value: TransactionType;
  label: string;
  description: string;
}> = [
  {
    value: 'expense',
    label: 'Expense',
    description: 'Counts toward spending analytics.',
  },
  {
    value: 'income',
    label: 'Income',
    description: 'Counts toward income analytics.',
  },
  {
    value: 'transfer',
    label: 'Transfer',
    description: 'Ignored in analytics as internal movement.',
  },
];

function inferCategoryGroupType(value: Record<string, unknown>): TransactionType {
  if (value.type === 'expense' || value.type === 'income' || value.type === 'transfer') {
    return value.type;
  }

  const hints = [value.id, value.name]
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().toLowerCase());

  if (hints.some((entry) => entry === 'income')) {
    return 'income';
  }

  if (hints.some((entry) => entry.includes('transfer'))) {
    return 'transfer';
  }

  return 'expense';
}

function getCategoryGroupTone(group: Pick<CategoryGroup, 'id' | 'type'> | { id: string; type?: TransactionType }): EntityCardTone {
  return GROUP_ENTITY_TONES[group.id] ?? (group.type ? CATEGORY_TYPE_TONES[group.type] : 'neutral');
}

interface ExportedCategoriesFile {
  schemaVersion: number;
  exportedAt: string;
  categoryCount: number;
  categoryGroupCount: number;
  categoryGroups: CategoryGroup[];
  categories: Category[];
}

const CATEGORIES_EXPORT_SCHEMA_VERSION = 1;

interface CategoryGroupSection {
  id: string;
  name: string;
  icon: string;
  type?: TransactionType;
  source?: CategoryGroup['source'];
  order: number;
  categories: Category[];
}

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
    type: inferCategoryGroupType(entry),
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

export function Categories() {
  useOnboarding();
  const categoriesResult = useCategories();
  const categoryGroupsResult = useCategoryGroups();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const createCategoryGroupMutation = useCreateCategoryGroup();
  const updateCategoryGroupMutation = useUpdateCategoryGroup();
  const deleteCategoryGroupMutation = useDeleteCategoryGroup();

  const allCategories = useMemo(() => categoriesResult.data ?? [], [categoriesResult.data]);
  const allCategoryGroups = useMemo(
    () => categoryGroupsResult.data ?? [],
    [categoryGroupsResult.data],
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<{ name: string; icon: string; groupId: string }>({
    name: '',
    icon: 'CircleDot',
    groupId: UNGROUPED_CATEGORY_GROUP_ID,
  });
  const [groupForm, setGroupForm] = useState<{ name: string; icon: string; type: TransactionType }>({
    name: '',
    icon: 'Folder',
    type: 'expense',
  });

  const categories = useMemo(
    () => allCategories.filter((category) => !category.hidden),
    [allCategories],
  );
  const categoryGroups = useMemo(
    () => allCategoryGroups.filter((group) => !group.hidden),
    [allCategoryGroups],
  );

  const iconPicker = useIconPicker();
  const { importError, isImporting, importInputRef, openFilePicker, handleFileChange, exportJsonFile } = useImportExport<{ categories: Category[]; categoryGroups: CategoryGroup[] }>({
    parseFile: parseImportedCategories,
    onImportSuccess: async (imported) => {
      let groupsCreated = 0;
      let categoriesCreated = 0;

      // Import category groups first
      const importedGroupIdMap = new Map<string, string>();
      for (const group of imported.categoryGroups) {
        try {
          const result = await createCategoryGroupMutation.mutateAsync({
            name: group.name,
            icon: group.icon,
            order: group.order,
            type: group.type,
            isDefault: false,
          });
          // Map old group ID to newly created server ID
          const newId = (result as Record<string, unknown>).id as string;
          importedGroupIdMap.set(group.id, newId);
          groupsCreated++;
        } catch {
          // Skip groups that fail (e.g. duplicates)
        }
      }

      // Import categories, remapping group IDs
      const existingGroupIds = new Set(categoryGroups.map((g) => g.id));
      for (const category of imported.categories) {
        const remappedGroupId = category.groupId
          ? importedGroupIdMap.get(category.groupId)
            ?? (existingGroupIds.has(category.groupId) ? category.groupId : undefined)
          : undefined;

        try {
          await createCategoryMutation.mutateAsync({
            name: category.name,
            icon: category.icon,
            groupId: remappedGroupId,
            isDefault: false,
          });
          categoriesCreated++;
        } catch {
          // Skip categories that fail
        }
      }

      const importedLabel = groupsCreated > 0
        ? `${categoriesCreated} categories and ${groupsCreated} groups imported`
        : `${categoriesCreated} categories imported`;
      toast.success(importedLabel);
    },
  });

  const orderedGroups = useMemo(
    () => [...categoryGroups].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [categoryGroups],
  );

  const groupedCategories = useMemo(() => {
    const groups: CategoryGroupSection[] = orderedGroups.map((group) => ({
      id: group.id,
      name: group.name,
      icon: group.icon,
      type: group.type,
      source: group.source,
      order: group.order,
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
        type: undefined,
        source: undefined,
        order: Number.MAX_SAFE_INTEGER,
        categories: ungrouped,
      });
    }

    return groups.filter((group) => group.categories.length > 0);
  }, [categories, orderedGroups]);

  const isPageLoading = categoriesResult.isLoading || categoryGroupsResult.isLoading;
  if (isPageLoading) return <EntityListSkeleton cardCount={4} />;
  if (categoriesResult.isError) return <QueryError message="Failed to load categories." onRetry={() => categoriesResult.refetch()} />;
  if (categoryGroupsResult.isError) return <QueryError message="Failed to load category groups." onRetry={() => categoryGroupsResult.refetch()} />;

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

  const openCreateGroupModal = () => {
    setGroupForm({
      name: '',
      icon: 'Folder',
      type: 'expense',
    });
    setEditingGroupId(null);
    iconPicker.setIconSearchQuery('');
    iconPicker.setIsIconPickerOpen(false);
    setIsGroupModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    if (LOCKED_CATEGORY_IDS.has(category.id)) {
      return;
    }

    setForm({
      name: category.name,
      icon: category.icon,
      groupId: category.groupId ?? UNGROUPED_CATEGORY_GROUP_ID,
    });
    setEditingCategoryId(category.id);
    iconPicker.setIconSearchQuery('');
    iconPicker.setIsIconPickerOpen(false);
    setIsCreateModalOpen(true);
  };

  const openEditGroupModal = (group: Pick<CategoryGroupSection, 'id' | 'name' | 'icon' | 'type'>) => {
    setGroupForm({
      name: group.name,
      icon: group.icon,
      type: group.type ?? 'expense',
    });
    setEditingGroupId(group.id);
    iconPicker.setIconSearchQuery('');
    iconPicker.setIsIconPickerOpen(false);
    setIsGroupModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategoryId(null);
    iconPicker.setIsIconPickerOpen(false);
  };

  const closeGroupModal = () => {
    setIsGroupModalOpen(false);
    setEditingGroupId(null);
    iconPicker.setIsIconPickerOpen(false);
  };

  const requestDeleteCategory = (category: Category) => {
    if (LOCKED_CATEGORY_IDS.has(category.id)) {
      return;
    }

    setCategoryToDelete(category);
  };

  const requestDeleteGroup = (group: Pick<CategoryGroupSection, 'id' | 'name'>) => {
    setGroupToDelete({ id: group.id, name: group.name });
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) {
      return;
    }

    if (LOCKED_CATEGORY_IDS.has(categoryToDelete.id)) {
      return;
    }

    deleteCategoryMutation.mutate(categoryToDelete.id, {
      onSuccess: () => {
        if (editingCategoryId === categoryToDelete.id) {
          closeModal();
        }
        setCategoryToDelete(null);
        toast.success("Category deleted");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete category'),
    });
  };

  const handleConfirmDeleteGroup = () => {
    if (!groupToDelete) {
      return;
    }

    deleteCategoryGroupMutation.mutate(groupToDelete.id, {
      onSuccess: () => {
        if (editingGroupId === groupToDelete.id) {
          closeGroupModal();
        }
        setGroupToDelete(null);
        toast.success('Category group deleted');
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete category group'),
    });
  };

  const handleCreateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const categoryName = form.name.trim();
    if (!categoryName) return;

    const groupId = form.groupId === UNGROUPED_CATEGORY_GROUP_ID ? undefined : form.groupId;

    if (editingCategoryId) {
      updateCategoryMutation.mutate(
        {
          id: editingCategoryId,
          name: categoryName,
          icon: form.icon,
          groupId,
        },
        {
          onSuccess: () => {
            closeModal();
            toast.success("Category updated");
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update category'),
        },
      );
      return;
    }

    createCategoryMutation.mutate(
      {
        name: categoryName,
        icon: form.icon,
        groupId,
        isDefault: false,
      },
      {
        onSuccess: () => {
          closeModal();
          toast.success("Category created");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create category'),
      },
    );
  };

  const handleCreateGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const groupName = groupForm.name.trim();
    if (!groupName) {
      return;
    }

    if (editingGroupId) {
      const currentGroup = orderedGroups.find((group) => group.id === editingGroupId);
      updateCategoryGroupMutation.mutate(
        {
          id: editingGroupId,
          name: groupName,
          icon: groupForm.icon,
          type: groupForm.type,
          order: currentGroup?.order,
        },
        {
          onSuccess: () => {
            closeGroupModal();
            toast.success('Category group updated');
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update category group'),
        },
      );
      return;
    }

    createCategoryGroupMutation.mutate(
      {
        name: groupName,
        icon: groupForm.icon,
        type: groupForm.type,
        order: (orderedGroups[orderedGroups.length - 1]?.order ?? 0) + 1,
        isDefault: false,
      },
      {
        onSuccess: () => {
          closeGroupModal();
          toast.success('Category group created');
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create category group'),
      },
    );
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

      {groupToDelete && (
        <DeleteConfirmationModal
          title="Delete category group?"
          description={(
            <>
              This will delete <span className="text-foreground">{groupToDelete.name}</span>. Categories in this group will stay in place and become ungrouped.
            </>
          )}
          confirmLabel="Delete group"
          onConfirm={handleConfirmDeleteGroup}
          onClose={() => setGroupToDelete(null)}
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
                      <SelectItem value={UNGROUPED_CATEGORY_GROUP_ID}>Ungrouped</SelectItem>
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

      {isGroupModalOpen && (
        <Dialog open onOpenChange={(open) => { if (!open) closeGroupModal(); }}>
          <DialogContent className="max-w-xl" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {editingGroupId ? 'Edit Category Group' : 'Create Category Group'}
              </DialogTitle>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleCreateGroup}>
              <div>
                <Label className="mb-1.5 block" htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  placeholder="Lifestyle"
                  value={groupForm.name}
                  onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>

              <div>
                <Label className="mb-2 block">Type</Label>
                <RadioGroup
                  value={groupForm.type}
                  onValueChange={(value) => {
                    if (value === 'expense' || value === 'income' || value === 'transfer') {
                      setGroupForm((current) => ({ ...current, type: value }));
                    }
                  }}
                  className="gap-2"
                >
                  {CATEGORY_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-(--radius-md) border border-border p-3 transition-colors',
                        groupForm.type === option.value && 'border-primary/50 bg-secondary/40',
                      )}
                    >
                      <RadioGroupItem value={option.value} id={`group-type-${option.value}`} className="mt-0.5" />
                      <span className="min-w-0">
                        <Badge variant={option.value}>{option.label}</Badge>
                        <span className="mt-1 block text-sm text-dimmed">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="relative">
                <Label className="mb-1.5 block" htmlFor="group-icon-search">Icon</Label>
                <button
                  type="button"
                  className="flex items-center justify-between w-full h-10 rounded-md border border-border bg-card px-4 text-base text-foreground transition-all duration-150 cursor-pointer"
                  onClick={() => iconPicker.setIsIconPickerOpen((current) => !current)}
                  aria-expanded={iconPicker.isIconPickerOpen}
                  aria-controls="group-icon-picker"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon name={groupForm.icon} size={16} className="text-foreground" />
                    <span className="text-base text-foreground truncate">{groupForm.icon}</span>
                  </span>
                  <ChevronDown size={16} className="text-dimmed" />
                </button>

                {iconPicker.isIconPickerOpen && (
                  <Card id="group-icon-picker" className="absolute z-20 mt-2 w-full p-3">
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dimmed" />
                      <Input
                        id="group-icon-search"
                        className="pl-9"
                        placeholder="Search icon"
                        value={iconPicker.iconSearchQuery}
                        onChange={(event) => iconPicker.setIconSearchQuery(event.target.value)}
                      />
                    </div>

                    <ScrollArea className="max-h-64 rounded-(--radius-md) border border-border">
                      {iconPicker.filteredIconNames.map((iconName) => {
                        const isSelected = groupForm.icon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => {
                              setGroupForm((current) => ({ ...current, icon: iconName }));
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
                  onClick={closeGroupModal}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGroupId ? 'Save Changes' : 'Create Group'}
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-dimmed">{categories.length} categories</span>
            <Button type="button" variant="outline" size="sm" onClick={openCreateGroupModal}>
              New Group
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {groupedCategories.map((group) => (
            <Card
              key={group.id}
              className="p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={cn(
                    'w-9 h-9 rounded-(--radius-md) flex items-center justify-center shrink-0',
                    getCategoryGroupTone(group) === 'neutral'
                      ? 'bg-foreground/10 text-muted-foreground'
                      : getCategoryGroupTone(group) === 'expense'
                        ? 'bg-expense/16 text-expense'
                        : getCategoryGroupTone(group) === 'income'
                          ? 'bg-income/16 text-income'
                          : getCategoryGroupTone(group) === 'transfer'
                            ? 'bg-transfer/16 text-transfer'
                            : getCategoryGroupTone(group) === 'accent'
                              ? 'bg-primary/16 text-primary'
                              : getCategoryGroupTone(group) === 'goal'
                                ? 'bg-goal/16 text-goal'
                                : 'bg-warning/16 text-warning',
                  )}>
                    <Icon name={group.icon} size={16} />
                  </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-medium text-foreground">{group.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm text-dimmed">{group.categories.length} categories</p>
                        {group.type && (
                          <Badge variant={group.type}>
                            {CATEGORY_TYPE_OPTIONS.find((option) => option.value === group.type)?.label ?? group.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="muted">{group.categories.length}</Badge>
                  {group.id !== UNGROUPED_CATEGORY_GROUP_ID && (
                    <EntityCardOverflowMenu
                      label={`Actions for ${group.name}`}
                      actions={[
                        { label: 'Edit', icon: Pencil, onClick: () => openEditGroupModal(group) },
                        { label: 'Delete', icon: Trash2, onClick: () => requestDeleteGroup(group), tone: 'danger' },
                      ]}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.categories.map((cat) => {
                  const isLocked = LOCKED_CATEGORY_IDS.has(cat.id);
                  const entityTone = getCategoryGroupTone(group);

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
              No visible categories yet. Add your first category to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
