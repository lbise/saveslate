import { UNCATEGORIZED_CATEGORY_ID } from '../../lib/transaction-type';
import type { Category, CategoryPreset } from '../../types';

const SYSTEM_CATEGORIES: Category[] = [
  {
    id: UNCATEGORIZED_CATEGORY_ID,
    name: 'Uncategorized',
    icon: 'CircleHelp',
    groupId: 'system',
    hidden: true,
    isDefault: true,
    source: 'system',
  },
];

// Default categories (universal labels — no type field)
export const CATEGORIES: Category[] = [
  // Expense-oriented categories
  { id: 'housing', name: 'Housing', icon: 'Home', groupId: 'living', isDefault: true, source: 'preset' },
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart', groupId: 'living', isDefault: true, source: 'preset' },
  { id: 'dining', name: 'Eating Out', icon: 'UtensilsCrossed', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'transport', name: 'Transport', icon: 'Train', groupId: 'living', isDefault: true, source: 'preset' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Gamepad2', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'health', name: 'Health', icon: 'Heart', groupId: 'living', isDefault: true, source: 'preset' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'Repeat', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'travel', name: 'Travel', icon: 'Mountain', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'gifts', name: 'Gifts', icon: 'Gift', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'insurance', name: 'Insurance', icon: 'Shield', groupId: 'finance', isDefault: true, source: 'preset' },
  { id: 'fees', name: 'Fees', icon: 'ReceiptText', groupId: 'finance', isDefault: true, source: 'preset' },
  { id: 'taxes', name: 'Taxes', icon: 'Landmark', groupId: 'finance', isDefault: true, source: 'preset' },
  { id: 'education', name: 'Education', icon: 'GraduationCap', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'charity', name: 'Charity', icon: 'HeartHandshake', groupId: 'lifestyle', isDefault: true, source: 'preset' },
  { id: 'personal', name: 'Personal', icon: 'User', groupId: 'living', isDefault: true, source: 'preset' },
  { id: 'communications', name: 'Communications', icon: 'Phone', groupId: 'living', isDefault: true, source: 'preset' },
  { id: 'utilities', name: 'Utilities', icon: 'Zap', groupId: 'living', isDefault: true, source: 'preset' },

  // Income-oriented categories
  { id: 'salary', name: 'Salary', icon: 'Briefcase', groupId: 'income', isDefault: true, source: 'preset' },
  { id: 'freelance', name: 'Freelance', icon: 'Laptop', groupId: 'income', isDefault: true, source: 'preset' },
  { id: 'interest', name: 'Interest', icon: 'Percent', groupId: 'income', isDefault: true, source: 'preset' },
  { id: 'investments', name: 'Investments', icon: 'TrendingUp', groupId: 'income', isDefault: true, source: 'preset' },
  { id: 'gifts-received', name: 'Gifts Received', icon: 'PartyPopper', groupId: 'income', isDefault: true, source: 'preset' },
  { id: 'income-other', name: 'Other', icon: 'CircleEllipsis', groupId: 'income', isDefault: true, source: 'preset' },

  // Transfer categories
  { id: 'transfer', name: 'Transfer', icon: 'ArrowLeftRight', groupId: 'transfers', isDefault: true, source: 'preset' },
  { id: 'savings-transfer', name: 'Savings', icon: 'PiggyBank', groupId: 'transfers', isDefault: true, source: 'preset' },
  { id: 'investment-transfer', name: 'Investments', icon: 'TrendingUp', groupId: 'transfers', isDefault: true, source: 'preset' },
  { id: 'retirement-transfer', name: 'Retirement', icon: 'Landmark', groupId: 'transfers', isDefault: true, source: 'preset' },
  { id: 'cash-withdrawal-transfer', name: 'Cash Withdrawal', icon: 'Banknote', groupId: 'transfers', isDefault: true, source: 'preset' },
];

const MINIMAL_CATEGORY_IDS = new Set([
  'housing',
  'groceries',
  'transport',
  'utilities',
  'salary',
  'income-other',
  'transfer',
]);

const LEGACY_CATEGORY_ID_ALIASES: Record<string, string> = {
  savings: 'savings-transfer',
  'atm-withdrawal-transfer': 'cash-withdrawal-transfer',
};

export function getAllCategoryTemplates(): Category[] {
  return [...SYSTEM_CATEGORIES, ...CATEGORIES];
}

export function getCategorySeedForPreset(preset: CategoryPreset): Category[] {
  if (preset === 'custom') {
    return [...SYSTEM_CATEGORIES];
  }

  if (preset === 'minimal') {
    return [
      ...SYSTEM_CATEGORIES,
      ...CATEGORIES.filter((category) => MINIMAL_CATEGORY_IDS.has(category.id)),
    ];
  }

  return getAllCategoryTemplates();
}

export const getCategoryById = (id: string): Category | undefined => {
  const normalizedId = LEGACY_CATEGORY_ID_ALIASES[id] ?? id;
  return getAllCategoryTemplates().find((category) => category.id === normalizedId);
};

export const getDefaultCategories = (): Category[] => {
  return getAllCategoryTemplates().filter((category) => category.isDefault);
};
