import type { Category } from '../../types';

// Playful, colorful categories with fun icons
export const CATEGORIES: Category[] = [
  // Expense categories
  {
    id: 'groceries',
    name: 'Groceries',
    icon: 'ShoppingCart',
    color: '#10b981', // emerald
    type: 'expense',
  },
  {
    id: 'dining',
    name: 'Dining Out',
    icon: 'UtensilsCrossed',
    color: '#f97316', // orange
    type: 'expense',
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'Train',
    color: '#3b82f6', // blue
    type: 'expense',
  },
  {
    id: 'entertainment',
    name: 'Fun & Games',
    icon: 'Gamepad2',
    color: '#a855f7', // purple
    type: 'expense',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'ShoppingBag',
    color: '#ec4899', // pink
    type: 'expense',
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    icon: 'Heart',
    color: '#ef4444', // red
    type: 'expense',
  },
  {
    id: 'home',
    name: 'Home & Living',
    icon: 'Home',
    color: '#8b5cf6', // violet
    type: 'expense',
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    icon: 'Repeat',
    color: '#06b6d4', // cyan
    type: 'expense',
  },
  {
    id: 'travel',
    name: 'Adventures',
    icon: 'Mountain',
    color: '#14b8a6', // teal
    type: 'expense',
  },
  {
    id: 'gifts',
    name: 'Gifts & Treats',
    icon: 'Gift',
    color: '#f43f5e', // rose
    type: 'expense',
  },

  // Income categories
  {
    id: 'salary',
    name: 'Salary',
    icon: 'Briefcase',
    color: '#22c55e', // green
    type: 'income',
  },
  {
    id: 'freelance',
    name: 'Side Hustle',
    icon: 'Laptop',
    color: '#6366f1', // indigo
    type: 'income',
  },
  {
    id: 'investments',
    name: 'Investments',
    icon: 'TrendingUp',
    color: '#eab308', // yellow
    type: 'income',
  },
  {
    id: 'gifts-received',
    name: 'Gifts Received',
    icon: 'PartyPopper',
    color: '#f472b6', // pink
    type: 'income',
  },
];

export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORIES.find((cat) => cat.id === id);
};

export const getExpenseCategories = (): Category[] => {
  return CATEGORIES.filter((cat) => cat.type === 'expense');
};

export const getIncomeCategories = (): Category[] => {
  return CATEGORIES.filter((cat) => cat.type === 'income');
};
