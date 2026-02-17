// Re-export all mock data
export * from './accounts';
export * from './categories';
export * from './goals';
export * from './transactions';

// Utility functions that combine data
import type {
  TransactionType,
  TransactionWithDetails,
  MonthlyStats,
  CategorySpending,
  GoalProgress,
  Transaction,
} from '../../types';
import { getTransactionsSorted } from './transactions';
import { getCategoryById, CATEGORIES } from './categories';
import { getAccountById } from './accounts';
import { getActiveGoals, getGoalById } from './goals';
import { inferTransactionType, UNCATEGORIZED_CATEGORY_ID } from '../../lib/transaction-type';

function toTransactionWithDetails(transaction: Transaction): TransactionWithDetails {
  const inferredType: TransactionType = inferTransactionType(transaction);

  const baseCategory = getCategoryById(transaction.categoryId) ?? {
    id: transaction.categoryId,
    name: transaction.categoryId === UNCATEGORIZED_CATEGORY_ID ? 'Uncategorized' : 'Unknown Category',
    type: inferredType,
    icon: 'CircleHelp',
  };

  const category = transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
    ? { ...baseCategory, type: inferredType }
    : baseCategory;

  const account = getAccountById(transaction.accountId) ?? {
    id: transaction.accountId,
    name: 'Unknown Account',
    type: 'checking',
    balance: 0,
    currency: transaction.currency || 'CHF',
    icon: 'Wallet',
  };

  const goal = transaction.goalId ? getGoalById(transaction.goalId) : undefined;

  return {
    ...transaction,
    category,
    account,
    goal,
  };
}

export const getTransactionsWithDetails = (): TransactionWithDetails[] => {
  return getTransactionsSorted().map((transaction) => toTransactionWithDetails(transaction));
};

export const getMonthlyStats = (): MonthlyStats => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const monthTransactions = getTransactionsWithDetails().filter(
    (t) => t.date >= startOfMonth
  );

  const totalIncome = monthTransactions
    .filter((t) => t.category.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter((t) => t.category.type === 'expense')
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

  const monthExpenses = getTransactionsWithDetails().filter(
    (t) => t.category.type === 'expense' && t.date >= startOfMonth
  );

  const totalExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Track spending per category
  const spendingByCategory = new Map<string, { amount: number; count: number }>();

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

export const getGoalProgress = (): GoalProgress[] => {
  const transactions = getTransactionsSorted();

  return getActiveGoals().map((goal) => {
    // Find all transactions directly linked to this goal
    const goalTransactions = transactions.filter((t) => t.goalId === goal.id);

    const startingAmount = goal.startingAmount ?? 0;
    const currentAmount = startingAmount + goalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const rawPercentage = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
    const percentage = Math.max(0, Math.min(rawPercentage, 100));

    return {
      goal,
      currentAmount,
      percentage,
      transactionCount: goalTransactions.length,
    };
  });
};

export const getPendingSplitTotal = (): number => {
  return getTransactionsSorted().filter((t) => t.split?.status === 'pending').reduce(
    (sum, t) => sum + t.amount * (1 - t.split!.ratio),
    0
  );
};

export { CATEGORIES };
