import type { CategoryGroup } from '../../types';

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'living',
    name: 'Living',
    icon: 'Home',
    order: 1,
    isDefault: true,
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    icon: 'Sparkles',
    order: 2,
    isDefault: true,
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: 'Landmark',
    order: 3,
    isDefault: true,
  },
  {
    id: 'income',
    name: 'Income',
    icon: 'Briefcase',
    order: 4,
    isDefault: true,
  },
  {
    id: 'transfers',
    name: 'Transfers',
    icon: 'ArrowLeftRight',
    order: 5,
    isDefault: true,
  },
];

export const getCategoryGroupById = (id: string): CategoryGroup | undefined => {
  return CATEGORY_GROUPS.find((group) => group.id === id);
};

export const getDefaultCategoryGroups = (): CategoryGroup[] => {
  return CATEGORY_GROUPS.filter((group) => group.isDefault);
};
