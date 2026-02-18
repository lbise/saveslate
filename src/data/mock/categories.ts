import type { Category, TransactionType } from '../../types';

// Default categories grouped by type
export const CATEGORIES: Category[] = [
  // Expense categories
  { id: 'housing', name: 'Housing', type: 'expense', icon: 'Home', isDefault: true },
  { id: 'groceries', name: 'Groceries', type: 'expense', icon: 'ShoppingCart', isDefault: true },
  { id: 'dining', name: 'Dining Out', type: 'expense', icon: 'UtensilsCrossed', isDefault: true },
  { id: 'transport', name: 'Transport', type: 'expense', icon: 'Train', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', type: 'expense', icon: 'Gamepad2', isDefault: true },
  { id: 'shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', isDefault: true },
  { id: 'health', name: 'Health', type: 'expense', icon: 'Heart', isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', icon: 'Repeat', isDefault: true },
  { id: 'travel', name: 'Travel', type: 'expense', icon: 'Mountain', isDefault: true },
  { id: 'gifts', name: 'Gifts', type: 'expense', icon: 'Gift', isDefault: true },
  { id: 'insurance', name: 'Insurance', type: 'expense', icon: 'Shield', isDefault: true },
  { id: 'fees', name: 'Fees', type: 'expense', icon: 'ReceiptText', isDefault: true },
  { id: 'taxes', name: 'Taxes', type: 'expense', icon: 'Landmark', isDefault: true },
  { id: 'education', name: 'Education', type: 'expense', icon: 'GraduationCap', isDefault: true },
  { id: 'charity', name: 'Charity', type: 'expense', icon: 'HeartHandshake', isDefault: true },
  { id: 'personal', name: 'Personal', type: 'expense', icon: 'User', isDefault: true },
  { id: 'utilities', name: 'Utilities', type: 'expense', icon: 'Zap', isDefault: true },

  // Income categories
  { id: 'salary', name: 'Salary', type: 'income', icon: 'Briefcase', isDefault: true },
  { id: 'freelance', name: 'Freelance', type: 'income', icon: 'Laptop', isDefault: true },
  { id: 'interest', name: 'Interest', type: 'income', icon: 'Percent', isDefault: true },
  { id: 'investments', name: 'Investments', type: 'income', icon: 'TrendingUp', isDefault: true },
  { id: 'gifts-received', name: 'Gifts Received', type: 'income', icon: 'PartyPopper', isDefault: true },
  { id: 'income-other', name: 'Other', type: 'income', icon: 'CircleEllipsis', isDefault: true },

  // Transfer categories
  { id: 'savings', name: 'Savings', type: 'transfer', icon: 'PiggyBank', isDefault: true },
  { id: 'investment-transfer', name: 'Investment Transfer', type: 'transfer', icon: 'ArrowLeftRight', isDefault: true },
];

export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORIES.find((c) => c.id === id);
};

export const getCategoriesByType = (type: TransactionType): Category[] => {
  return CATEGORIES.filter((c) => c.type === type);
};

export const getDefaultCategories = (): Category[] => {
  return CATEGORIES.filter((c) => c.isDefault);
};
