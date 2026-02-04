import type { Tag } from '../../types';

// Default tags (converted from categories) + goal-related tags
export const TAGS: Tag[] = [
  // Expense tags
  {
    id: 'groceries',
    name: 'Groceries',
    icon: 'ShoppingCart',
    color: '#10b981', // emerald
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'dining',
    name: 'Dining Out',
    icon: 'UtensilsCrossed',
    color: '#f97316', // orange
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'Train',
    color: '#3b82f6', // blue
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'entertainment',
    name: 'Fun & Games',
    icon: 'Gamepad2',
    color: '#a855f7', // purple
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'ShoppingBag',
    color: '#ec4899', // pink
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    icon: 'Heart',
    color: '#ef4444', // red
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'home',
    name: 'Home & Living',
    icon: 'Home',
    color: '#8b5cf6', // violet
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    icon: 'Repeat',
    color: '#06b6d4', // cyan
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'travel',
    name: 'Adventures',
    icon: 'Mountain',
    color: '#14b8a6', // teal
    type: 'expense',
    isDefault: true,
  },
  {
    id: 'gifts',
    name: 'Gifts & Treats',
    icon: 'Gift',
    color: '#f43f5e', // rose
    type: 'expense',
    isDefault: true,
  },

  // Income tags
  {
    id: 'salary',
    name: 'Salary',
    icon: 'Briefcase',
    color: '#22c55e', // green
    type: 'income',
    isDefault: true,
  },
  {
    id: 'freelance',
    name: 'Side Hustle',
    icon: 'Laptop',
    color: '#6366f1', // indigo
    type: 'income',
    isDefault: true,
  },
  {
    id: 'investments',
    name: 'Investments',
    icon: 'TrendingUp',
    color: '#eab308', // yellow
    type: 'income',
    isDefault: true,
  },
  {
    id: 'gifts-received',
    name: 'Gifts Received',
    icon: 'PartyPopper',
    color: '#f472b6', // pink
    type: 'income',
    isDefault: true,
  },

  // Goal-related tags (auto-created with goals)
  {
    id: 'goal-summer-vacation',
    name: 'Summer Vacation',
    icon: 'Palmtree',
    color: '#0ea5e9', // sky
    type: 'expense',
    isDefault: false,
    goalId: 'goal-1',
  },
  {
    id: 'goal-new-laptop',
    name: 'New Laptop',
    icon: 'Laptop',
    color: '#8b5cf6', // violet
    type: 'expense',
    isDefault: false,
    goalId: 'goal-2',
  },
];

export const getTagById = (id: string): Tag | undefined => {
  return TAGS.find((tag) => tag.id === id);
};

export const getTagsByIds = (ids: string[]): Tag[] => {
  return ids.map((id) => getTagById(id)).filter((tag): tag is Tag => tag !== undefined);
};

export const getExpenseTags = (): Tag[] => {
  return TAGS.filter((tag) => tag.type === 'expense');
};

export const getIncomeTags = (): Tag[] => {
  return TAGS.filter((tag) => tag.type === 'income');
};

export const getDefaultTags = (): Tag[] => {
  return TAGS.filter((tag) => tag.isDefault);
};

export const getGoalTags = (): Tag[] => {
  return TAGS.filter((tag) => tag.goalId !== undefined);
};
