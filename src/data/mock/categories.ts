import type { Category } from '../../types';

// Default categories (universal labels — no type field)
export const CATEGORIES: Category[] = [
  // Expense-oriented categories
  { id: 'housing', name: 'Housing', icon: 'Home', groupId: 'living', isDefault: true },
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart', groupId: 'living', isDefault: true },
  { id: 'dining', name: 'Eating Out', icon: 'UtensilsCrossed', groupId: 'lifestyle', isDefault: true },
  { id: 'transport', name: 'Transport', icon: 'Train', groupId: 'living', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: 'Gamepad2', groupId: 'lifestyle', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', groupId: 'lifestyle', isDefault: true },
  { id: 'health', name: 'Health', icon: 'Heart', groupId: 'living', isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'Repeat', groupId: 'lifestyle', isDefault: true },
  { id: 'travel', name: 'Travel', icon: 'Mountain', groupId: 'lifestyle', isDefault: true },
  { id: 'gifts', name: 'Gifts', icon: 'Gift', groupId: 'lifestyle', isDefault: true },
  { id: 'insurance', name: 'Insurance', icon: 'Shield', groupId: 'finance', isDefault: true },
  { id: 'fees', name: 'Fees', icon: 'ReceiptText', groupId: 'finance', isDefault: true },
  { id: 'taxes', name: 'Taxes', icon: 'Landmark', groupId: 'finance', isDefault: true },
  { id: 'education', name: 'Education', icon: 'GraduationCap', groupId: 'lifestyle', isDefault: true },
  { id: 'charity', name: 'Charity', icon: 'HeartHandshake', groupId: 'lifestyle', isDefault: true },
  { id: 'personal', name: 'Personal', icon: 'User', groupId: 'living', isDefault: true },
  { id: 'communications', name: 'Communications', icon: 'Phone', groupId: 'living', isDefault: true },
  { id: 'utilities', name: 'Utilities', icon: 'Zap', groupId: 'living', isDefault: true },

  // Income-oriented categories
  { id: 'salary', name: 'Salary', icon: 'Briefcase', groupId: 'income', isDefault: true },
  { id: 'freelance', name: 'Freelance', icon: 'Laptop', groupId: 'income', isDefault: true },
  { id: 'interest', name: 'Interest', icon: 'Percent', groupId: 'income', isDefault: true },
  { id: 'investments', name: 'Investments', icon: 'TrendingUp', groupId: 'income', isDefault: true },
  { id: 'gifts-received', name: 'Gifts Received', icon: 'PartyPopper', groupId: 'income', isDefault: true },
  { id: 'income-other', name: 'Other', icon: 'CircleEllipsis', groupId: 'income', isDefault: true },

  // Transfer categories
  { id: 'transfer', name: 'Transfer', icon: 'ArrowLeftRight', groupId: 'transfers', isDefault: true },
  { id: 'savings-transfer', name: 'Savings', icon: 'PiggyBank', groupId: 'transfers', isDefault: true },
  { id: 'investment-transfer', name: 'Investments', icon: 'TrendingUp', groupId: 'transfers', isDefault: true },
  { id: 'retirement-transfer', name: 'Retirement', icon: 'Landmark', groupId: 'transfers', isDefault: true },
  { id: 'cash-withdrawal-transfer', name: 'Cash Withdrawal', icon: 'Banknote', groupId: 'transfers', isDefault: true },
];

const LEGACY_CATEGORY_ID_ALIASES: Record<string, string> = {
  savings: 'savings-transfer',
  'atm-withdrawal-transfer': 'cash-withdrawal-transfer',
};

export const getCategoryById = (id: string): Category | undefined => {
  const normalizedId = LEGACY_CATEGORY_ID_ALIASES[id] ?? id;
  return CATEGORIES.find((c) => c.id === normalizedId);
};

export const getDefaultCategories = (): Category[] => {
  return CATEGORIES.filter((c) => c.isDefault);
};
