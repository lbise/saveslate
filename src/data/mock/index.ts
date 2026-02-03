// Re-export all mock data
export * from './accounts';
export * from './categories';
export * from './transactions';

// Utility functions that combine data
import type { TransactionWithDetails, MonthlyStats, CategorySpending } from '../../types';
import { TRANSACTIONS, getTransactionsSorted } from './transactions';
import { getCategoryById } from './categories';
import { getAccountById } from './accounts';

export const getTransactionsWithDetails = (): TransactionWithDetails[] => {
  return getTransactionsSorted().map((t) => ({
    ...t,
    category: getCategoryById(t.categoryId)!,
    account: getAccountById(t.accountId)!,
  }));
};

export const getMonthlyStats = (): MonthlyStats => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const monthTransactions = TRANSACTIONS.filter((t) => t.date >= startOfMonth);

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
  };
};

export const getCategorySpending = (): CategorySpending[] => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const monthExpenses = TRANSACTIONS.filter(
    (t) => t.type === 'expense' && t.date >= startOfMonth
  );

  const totalExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

  const spendingByCategory = new Map<
    string,
    { amount: number; count: number }
  >();

  monthExpenses.forEach((t) => {
    const existing = spendingByCategory.get(t.categoryId) || {
      amount: 0,
      count: 0,
    };
    spendingByCategory.set(t.categoryId, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
    });
  });

  const result: CategorySpending[] = [];

  spendingByCategory.forEach((data, categoryId) => {
    const category = getCategoryById(categoryId);
    if (category) {
      result.push({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        transactionCount: data.count,
      });
    }
  });

  // Sort by amount descending
  return result.sort((a, b) => b.amount - a.amount);
};
