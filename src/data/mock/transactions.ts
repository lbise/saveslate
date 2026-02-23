import { loadTransactions } from '../../lib/transaction-storage';
import type { Transaction } from '../../types';

function sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => {
      const leftWithTime = new Date(`${a.date}T${a.time ?? '00:00:00'}`).getTime();
      const rightWithTime = new Date(`${b.date}T${b.time ?? '00:00:00'}`).getTime();
      const left = Number.isNaN(leftWithTime) ? new Date(a.date).getTime() : leftWithTime;
      const right = Number.isNaN(rightWithTime) ? new Date(b.date).getTime() : rightWithTime;
      return right - left;
    },
  );
}

// Sort transactions by date (newest first)
export const getTransactionsSorted = (): Transaction[] => {
  return sortTransactionsByDate(loadTransactions());
};

export const getRecentTransactions = (count: number = 5): Transaction[] => {
  return getTransactionsSorted().slice(0, count);
};

export const getTransactionsByDateRange = (
  startDate: string,
  endDate: string,
): Transaction[] => {
  return getTransactionsSorted().filter((t) => {
    return t.date >= startDate && t.date <= endDate;
  });
};

export const getTransactionsByCategory = (categoryId: string): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.categoryId === categoryId);
};

export const getTransactionsByGoal = (goalId: string): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.goalId === goalId);
};

export const getTransactionsByAccount = (accountId: string): Transaction[] => {
  return getTransactionsSorted().filter(
    (t) => t.accountId === accountId || t.destinationAccountId === accountId,
  );
};

export const getSplitTransactions = (): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.split !== undefined);
};

export const getPendingSplitTransactions = (): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.split?.status === 'pending');
};
