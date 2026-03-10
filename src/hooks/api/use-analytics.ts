import { useQuery } from '@tanstack/react-query';
import { api, toNumber } from '@/lib/api-client';
import type {
  AnalyticsSummary,
  CategoryBreakdown,
  MonthlyBreakdown,
  ApiGoalProgress,
  AccountBalance,
} from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (filters?: AnalyticsFilters) => ['analytics', 'summary', filters] as const,
  byMonth: (filters?: AnalyticsFilters) => ['analytics', 'byMonth', filters] as const,
  byCategory: (filters?: CategoryAnalyticsFilters) => ['analytics', 'byCategory', filters] as const,
  accountBalances: ['analytics', 'accountBalances'] as const,
  goalProgress: (archived?: boolean) => ['analytics', 'goalProgress', { archived }] as const,
};

// ─── Filter Types ────────────────────────────────────────────────────

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

export interface CategoryAnalyticsFilters extends AnalyticsFilters {
  type?: 'income' | 'expense';
}

// ─── Decimal Transformers ────────────────────────────────────────────

function transformSummary(raw: Record<string, unknown>): AnalyticsSummary {
  return {
    totalIncome: toNumber(raw.totalIncome as string | number),
    totalExpenses: toNumber(raw.totalExpenses as string | number),
    net: toNumber(raw.net as string | number),
    averageTransaction: toNumber(raw.averageTransaction as string | number),
    transactionCount: raw.transactionCount as number,
    startDate: raw.startDate as string | undefined,
    endDate: raw.endDate as string | undefined,
  };
}

function transformMonthly(raw: Record<string, unknown>): MonthlyBreakdown {
  return {
    month: raw.month as string,
    income: toNumber(raw.income as string | number),
    expenses: toNumber(raw.expenses as string | number),
    net: toNumber(raw.net as string | number),
    transactionCount: raw.transactionCount as number,
  };
}

function transformCategoryBreakdown(raw: Record<string, unknown>): CategoryBreakdown {
  return {
    categoryId: raw.categoryId as string | undefined,
    categoryName: raw.categoryName as string | undefined,
    categoryIcon: raw.categoryIcon as string | undefined,
    total: toNumber(raw.total as string | number),
    count: raw.count as number,
    percentage: toNumber(raw.percentage as string | number),
  };
}

function transformGoalProgress(raw: Record<string, unknown>): ApiGoalProgress {
  return {
    goalId: raw.goalId as string,
    name: raw.name as string,
    icon: raw.icon as string,
    startingAmount: toNumber(raw.startingAmount as string | number),
    targetAmount: toNumber(raw.targetAmount as string | number),
    currentAmount: toNumber(raw.currentAmount as string | number),
    progressPercentage: toNumber(raw.progressPercentage as string | number),
    remainingAmount: toNumber(raw.remainingAmount as string | number),
    totalContributions: toNumber(raw.totalContributions as string | number),
    contributionCount: raw.contributionCount as number,
    hasTarget: raw.hasTarget as boolean,
    deadline: raw.deadline as string | undefined,
    isArchived: raw.isArchived as boolean,
  };
}

function transformAccountBalance(raw: Record<string, unknown>): AccountBalance {
  return {
    accountId: raw.accountId as string,
    name: raw.name as string,
    computedBalance: toNumber(raw.computedBalance as string | number),
    manualBalance: toNumber(raw.manualBalance as string | number),
    currency: raw.currency as string,
    transactionCount: raw.transactionCount as number,
    lastTransactionDate: raw.lastTransactionDate as string | undefined,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** Analytics summary (income, expenses, net) for a date range. */
export function useAnalyticsSummary(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.summary(filters),
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>>('/api/analytics/summary', filters ? { ...filters } : undefined);
      return transformSummary(data);
    },
  });
}

/** Monthly income/expense breakdown. */
export function useAnalyticsByMonth(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.byMonth(filters),
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>[]>('/api/analytics/by-month', filters ? { ...filters } : undefined);
      return data.map(transformMonthly);
    },
  });
}

/** Spending by category. */
export function useAnalyticsByCategory(filters?: CategoryAnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.byCategory(filters),
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>[]>('/api/analytics/by-category', filters ? { ...filters } : undefined);
      return data.map(transformCategoryBreakdown);
    },
  });
}

/** Computed account balances. */
export function useAccountBalances() {
  return useQuery({
    queryKey: analyticsKeys.accountBalances,
    queryFn: async () => {
      const data = await api.get<Record<string, unknown>[]>('/api/analytics/account-balances');
      return data.map(transformAccountBalance);
    },
  });
}

/** Goal progress with contribution tracking. */
export function useGoalProgress(archived?: boolean) {
  return useQuery({
    queryKey: analyticsKeys.goalProgress(archived),
    queryFn: async () => {
      const params = archived !== undefined ? { archived } : undefined;
      const data = await api.get<Record<string, unknown>[]>('/api/analytics/goal-progress', params);
      return data.map(transformGoalProgress);
    },
  });
}
