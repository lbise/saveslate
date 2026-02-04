// Re-export all mock data
export * from './accounts';
export * from './tags';
export * from './goals';
export * from './transactions';

// Utility functions that combine data
import type { TransactionWithDetails, MonthlyStats, TagSpending, GoalProgress } from '../../types';
import { TRANSACTIONS, getTransactionsSorted } from './transactions';
import { getTagById, getTagsByIds, TAGS } from './tags';
import { getAccountById } from './accounts';
import { GOALS, getGoalByTagId } from './goals';

export const getTransactionsWithDetails = (): TransactionWithDetails[] => {
  return getTransactionsSorted().map((t) => {
    const tags = getTagsByIds(t.tagIds);
    // Find if any tag is associated with a goal
    const goalTag = tags.find((tag) => tag.goalId);
    const goal = goalTag ? getGoalByTagId(goalTag.id) : undefined;

    return {
      ...t,
      tags,
      account: getAccountById(t.accountId)!,
      goal,
    };
  });
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

export const getTagSpending = (): TagSpending[] => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const monthExpenses = TRANSACTIONS.filter(
    (t) => t.type === 'expense' && t.date >= startOfMonth
  );

  const totalExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Track spending per tag (first tag is primary for analytics)
  const spendingByTag = new Map<string, { amount: number; count: number }>();

  monthExpenses.forEach((t) => {
    // Use the first tag as the primary tag for spending analytics
    const primaryTagId = t.tagIds[0];
    if (primaryTagId) {
      const existing = spendingByTag.get(primaryTagId) || {
        amount: 0,
        count: 0,
      };
      spendingByTag.set(primaryTagId, {
        amount: existing.amount + t.amount,
        count: existing.count + 1,
      });
    }
  });

  const result: TagSpending[] = [];

  spendingByTag.forEach((data, tagId) => {
    const tag = getTagById(tagId);
    if (tag) {
      result.push({
        tag,
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
  return GOALS.filter((goal) => !goal.isArchived).map((goal) => {
    // Find all transactions with this goal's tag
    const goalTransactions = TRANSACTIONS.filter((t) =>
      t.tagIds.includes(goal.tagId)
    );

    const currentAmount = goalTransactions.reduce((sum, t) => sum + t.amount, 0);
    const percentage = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;

    return {
      goal,
      currentAmount,
      percentage: Math.min(percentage, 100),
      transactionCount: goalTransactions.length,
    };
  });
};

export const getPendingSplitTotal = (): number => {
  return TRANSACTIONS.filter((t) => t.split?.status === 'pending').reduce(
    (sum, t) => sum + t.amount * (1 - t.split!.ratio),
    0
  );
};

export { TAGS, GOALS };
