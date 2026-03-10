// Re-export all mock data
export * from './accounts';
export * from './categories';
export * from './category-groups';
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
import { getCategoryById } from '../../lib/category-storage';
import { getAccountById } from './accounts';
import { getActiveGoals, getGoalById } from './goals';
import { inferTransactionType, UNCATEGORIZED_CATEGORY_ID } from '../../lib/transaction-type';

function createTransferCounterpartyMap(transactions: Transaction[]): Map<string, string> {
  const transactionsByPairId = new Map<string, Transaction[]>();

  transactions.forEach((transaction) => {
    if (!transaction.transferPairId) {
      return;
    }

    const pairTransactions = transactionsByPairId.get(transaction.transferPairId) ?? [];
    pairTransactions.push(transaction);
    transactionsByPairId.set(transaction.transferPairId, pairTransactions);
  });

  const counterpartyByTransactionId = new Map<string, string>();
  for (const [, pairTransactions] of transactionsByPairId) {
    if (pairTransactions.length !== 2) {
      continue;
    }

    const [left, right] = pairTransactions;
    counterpartyByTransactionId.set(left.id, right.accountId);
    counterpartyByTransactionId.set(right.id, left.accountId);
  }

  return counterpartyByTransactionId;
}

function toTransactionWithDetails(
  transaction: Transaction,
  counterpartyByTransactionId: Map<string, string>,
): TransactionWithDetails {
  const type: TransactionType = inferTransactionType(transaction);

  const category = getCategoryById(transaction.categoryId) ?? {
    id: transaction.categoryId,
    name: transaction.categoryId === UNCATEGORIZED_CATEGORY_ID ? 'Uncategorized' : 'Unknown Category',
    icon: 'CircleHelp',
  };

  const account = getAccountById(transaction.accountId) ?? {
    id: transaction.accountId,
    name: 'Unknown Account',
    type: 'checking',
    balance: 0,
    currency: transaction.currency || 'CHF',
    icon: 'Wallet',
  };

  const goal = transaction.goalId ? getGoalById(transaction.goalId) : undefined;

  const counterpartyAccountId = counterpartyByTransactionId.get(transaction.id);

  const destinationAccount = counterpartyAccountId
    ? (getAccountById(counterpartyAccountId) ?? {
        id: counterpartyAccountId,
        name: 'Unknown Account',
        type: 'checking' as const,
        balance: 0,
        currency: transaction.currency || 'CHF',
        icon: 'Wallet',
      })
    : undefined;

  return {
    ...transaction,
    type,
    category,
    account,
    destinationAccount,
    goal,
  };
}

export const getTransactionsWithDetails = (): TransactionWithDetails[] => {
  const transactions = getTransactionsSorted();
  const counterpartyByTransactionId = createTransferCounterpartyMap(transactions);
  return transactions.map((transaction) => toTransactionWithDetails(transaction, counterpartyByTransactionId));
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
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const seenTransferPairIds = new Set<string>();
  const totalTransfers = monthTransactions
    .filter((t) => t.type === 'transfer')
    .reduce((sum, t) => {
      if (t.transferPairId) {
        if (seenTransferPairIds.has(t.transferPairId)) {
          return sum;
        }
        seenTransferPairIds.add(t.transferPairId);
      }
      return sum + Math.abs(t.amount);
    }, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    totalTransfers,
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
    (t) => t.type === 'expense' && t.date >= startOfMonth
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

  const getContributionPeriods = (
    frequency: 'weekly' | 'monthly',
    dueDate?: string,
  ): number => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const effectiveDueDate = dueDate
      ? new Date(`${dueDate}T00:00:00`)
      : new Date(startDate.getFullYear(), 11, 31);

    if (Number.isNaN(effectiveDueDate.getTime()) || effectiveDueDate <= startDate) {
      return 1;
    }

    if (frequency === 'weekly') {
      const millisecondsPerDay = 1000 * 60 * 60 * 24;
      const dayDiff = Math.floor((effectiveDueDate.getTime() - startDate.getTime()) / millisecondsPerDay);
      return Math.max(1, Math.floor(dayDiff / 7));
    }

    const monthDiff =
      (effectiveDueDate.getFullYear() - startDate.getFullYear()) * 12
      + effectiveDueDate.getMonth()
      - startDate.getMonth();
    const adjustedMonthDiff = effectiveDueDate.getDate() < startDate.getDate()
      ? monthDiff - 1
      : monthDiff;
    return Math.max(1, adjustedMonthDiff);
  };

  return getActiveGoals().map((goal) => {
    // Find all transactions directly linked to this goal
    const goalTransactions = transactions.filter((t) => t.goalId === goal.id);

    const startingAmount = goal.startingAmount ?? 0;
    const currentAmount = startingAmount + goalTransactions.reduce((sum, t) => sum + t.amount, 0);

    let rawPercentage = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
    if (goal.expectedContribution && goal.expectedContribution.amount > 0) {
      const contributionPeriods = getContributionPeriods(
        goal.expectedContribution.frequency,
        goal.deadline,
      );
      const contributionTarget = goal.expectedContribution.amount * contributionPeriods;
      const contributionProgress = currentAmount - startingAmount;
      rawPercentage = contributionTarget > 0
        ? (contributionProgress / contributionTarget) * 100
        : 0;
    }

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
