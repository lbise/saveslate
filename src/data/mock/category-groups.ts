import type { CategoryGroup, CategoryPreset } from '../../types';

const SYSTEM_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'system',
    name: 'System',
    icon: 'Settings2',
    order: 0,
    hidden: true,
    isDefault: true,
    source: 'system',
  },
];

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'living',
    name: 'Living',
    icon: 'Home',
    order: 1,
    isDefault: true,
    source: 'preset',
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    icon: 'Sparkles',
    order: 2,
    isDefault: true,
    source: 'preset',
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'Landmark',
    order: 3,
    isDefault: true,
    source: 'preset',
  },
  {
    id: 'income',
    name: 'Income',
    icon: 'Briefcase',
    order: 4,
    isDefault: true,
    source: 'preset',
  },
  {
    id: 'transfers',
    name: 'Transfers',
    icon: 'ArrowLeftRight',
    order: 5,
    isDefault: true,
    source: 'preset',
  },
];

const MINIMAL_CATEGORY_GROUP_IDS = new Set(['living', 'income', 'transfers']);

export function getAllCategoryGroupTemplates(): CategoryGroup[] {
  return [...SYSTEM_CATEGORY_GROUPS, ...CATEGORY_GROUPS];
}

export function getCategoryGroupSeedForPreset(preset: CategoryPreset): CategoryGroup[] {
  if (preset === 'custom') {
    return [...SYSTEM_CATEGORY_GROUPS];
  }

  if (preset === 'minimal') {
    return [
      ...SYSTEM_CATEGORY_GROUPS,
      ...CATEGORY_GROUPS.filter((group) => MINIMAL_CATEGORY_GROUP_IDS.has(group.id)),
    ];
  }

  return getAllCategoryGroupTemplates();
}

export const getCategoryGroupById = (id: string): CategoryGroup | undefined => {
  return getAllCategoryGroupTemplates().find((group) => group.id === id);
};

export const getDefaultCategoryGroups = (): CategoryGroup[] => {
  return getAllCategoryGroupTemplates().filter((group) => group.isDefault);
};
