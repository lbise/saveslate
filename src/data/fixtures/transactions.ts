import type { Transaction } from '../../types';

function getIsoDateDaysAgo(daysAgo: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - daysAgo));
  return date.toISOString().split('T')[0];
}

const BALANCED_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-balanced-income-salary',
    amount: 5200,
    currency: 'CHF',
    categoryId: 'salary',
    description: 'Monthly Salary',
    date: getIsoDateDaysAgo(2),
    accountId: 'demo-account-checking',
  },
  {
    id: 'demo-balanced-income-freelance',
    amount: 950,
    currency: 'CHF',
    categoryId: 'freelance',
    description: 'Freelance Project',
    date: getIsoDateDaysAgo(6),
    accountId: 'demo-account-checking',
  },
  {
    id: 'demo-balanced-expense-housing',
    amount: -1650,
    currency: 'CHF',
    categoryId: 'housing',
    description: 'Rent',
    date: getIsoDateDaysAgo(3),
    accountId: 'demo-account-checking',
  },
  {
    id: 'demo-balanced-expense-groceries',
    amount: -420,
    currency: 'CHF',
    categoryId: 'groceries',
    description: 'Groceries',
    date: getIsoDateDaysAgo(5),
    accountId: 'demo-account-checking',
  },
  {
    id: 'demo-balanced-expense-transport',
    amount: -180,
    currency: 'CHF',
    categoryId: 'transport',
    description: 'Public Transport Pass',
    date: getIsoDateDaysAgo(8),
    accountId: 'demo-account-checking',
  },
  {
    id: 'demo-balanced-expense-dining',
    amount: -260,
    currency: 'CHF',
    categoryId: 'dining',
    description: 'Dining Out',
    date: getIsoDateDaysAgo(10),
    accountId: 'demo-account-checking',
  },
  {
    id: 'demo-balanced-expense-insurance',
    amount: -210,
    currency: 'CHF',
    categoryId: 'insurance',
    description: 'Insurance Premium',
    date: getIsoDateDaysAgo(11),
    accountId: 'demo-account-checking',
  },
  {
    id: 'demo-balanced-transfer-out',
    amount: -500,
    currency: 'CHF',
    categoryId: 'savings-transfer',
    description: 'Transfer to Savings Account',
    date: getIsoDateDaysAgo(4),
    accountId: 'demo-account-checking',
    transferPairId: 'demo-balanced-transfer-pair-1',
  },
  {
    id: 'demo-balanced-transfer-in',
    amount: 500,
    currency: 'CHF',
    categoryId: 'savings-transfer',
    description: 'Transfer from Checking Account',
    date: getIsoDateDaysAgo(4),
    accountId: 'demo-account-savings',
    transferPairId: 'demo-balanced-transfer-pair-1',
  },
];

const TIGHT_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-tight-income-salary',
    amount: 2800,
    currency: 'CHF',
    categoryId: 'salary',
    description: 'Monthly Salary',
    date: getIsoDateDaysAgo(2),
    accountId: 'demo-tight-account-checking',
  },
  {
    id: 'demo-tight-income-interest',
    amount: 55,
    currency: 'CHF',
    categoryId: 'interest',
    description: 'Interest Payout',
    date: getIsoDateDaysAgo(13),
    accountId: 'demo-tight-account-checking',
  },
  {
    id: 'demo-tight-expense-housing',
    amount: -1800,
    currency: 'CHF',
    categoryId: 'housing',
    description: 'Rent',
    date: getIsoDateDaysAgo(3),
    accountId: 'demo-tight-account-checking',
  },
  {
    id: 'demo-tight-expense-groceries',
    amount: -520,
    currency: 'CHF',
    categoryId: 'groceries',
    description: 'Groceries',
    date: getIsoDateDaysAgo(5),
    accountId: 'demo-tight-account-checking',
  },
  {
    id: 'demo-tight-expense-utilities',
    amount: -320,
    currency: 'CHF',
    categoryId: 'utilities',
    description: 'Utilities',
    date: getIsoDateDaysAgo(7),
    accountId: 'demo-tight-account-checking',
  },
  {
    id: 'demo-tight-expense-transport',
    amount: -250,
    currency: 'CHF',
    categoryId: 'transport',
    description: 'Transport',
    date: getIsoDateDaysAgo(9),
    accountId: 'demo-tight-account-checking',
  },
  {
    id: 'demo-tight-expense-subscriptions',
    amount: -140,
    currency: 'CHF',
    categoryId: 'subscriptions',
    description: 'Monthly Subscriptions',
    date: getIsoDateDaysAgo(12),
    accountId: 'demo-tight-account-checking',
  },
  {
    id: 'demo-tight-transfer-out',
    amount: -200,
    currency: 'CHF',
    categoryId: 'transfer',
    description: 'Transfer to Joint Account',
    date: getIsoDateDaysAgo(6),
    accountId: 'demo-tight-account-checking',
    transferPairId: 'demo-tight-transfer-pair-1',
  },
  {
    id: 'demo-tight-transfer-in',
    amount: 200,
    currency: 'CHF',
    categoryId: 'transfer',
    description: 'Transfer from Checking Account',
    date: getIsoDateDaysAgo(6),
    accountId: 'demo-tight-account-joint',
    transferPairId: 'demo-tight-transfer-pair-1',
  },
];

export function loadBalancedDemoTransactions(): Transaction[] {
  return BALANCED_DEMO_TRANSACTIONS.map((transaction) => ({ ...transaction }));
}

export function loadTightDemoTransactions(): Transaction[] {
  return TIGHT_DEMO_TRANSACTIONS.map((transaction) => ({ ...transaction }));
}
