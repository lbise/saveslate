import type { GoalProgress, TransactionWithDetails } from '../types';
import type { DefaultLink } from '@nivo/sankey';

// ── Types ──────────────────────────────────────────────────────

export type DateRangePeriod =
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'this-year'
  | 'all-time';

export interface SankeyNodeInput {
  id: string;
  nodeColor: string;
  nodeLabel: string;
}

export interface SankeyResult {
  nodes: SankeyNodeInput[];
  links: DefaultLink[];
  summary: PeriodSummary;
}

export interface PeriodSummary {
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  netSavings: number;
}

export interface MonthlyIncomeExpensePoint {
  [key: string]: string | number;
  monthKey: string;
  monthLabel: string;
  income: number;
  expenses: number;
  net: number;
}

export interface AnalyticsPieDatum {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface GoalSavedPoint {
  [key: string]: string | number;
  goalId: string;
  goalLabel: string;
  saved: number;
}

// ── Period helpers ─────────────────────────────────────────────

export const DATE_RANGE_OPTIONS: { value: DateRangePeriod; label: string }[] = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3-months', label: '3 Months' },
  { value: 'last-6-months', label: '6 Months' },
  { value: 'this-year', label: 'This Year' },
  { value: 'all-time', label: 'All Time' },
];

export function getDateRange(period: DateRangePeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  switch (period) {
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { start, end };
    }
    case 'last-month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end: endDate };
    }
    case 'last-3-months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      return { start, end };
    }
    case 'last-6-months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
      return { start, end };
    }
    case 'this-year': {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { start, end };
    }
    case 'all-time':
      return { start: '1970-01-01', end };
  }
}

function toMonthStart(dateString: string): Date {
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(1970, 0, 1);
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getFilteredTransactions(
  transactions: TransactionWithDetails[],
  period: DateRangePeriod,
): TransactionWithDetails[] {
  const { start, end } = getDateRange(period);
  return transactions.filter((transaction) => transaction.date >= start && transaction.date <= end);
}

export function buildMonthlyIncomeExpenseSeries(
  transactions: TransactionWithDetails[],
  period: DateRangePeriod,
): MonthlyIncomeExpensePoint[] {
  const { start, end } = getDateRange(period);
  const filtered = getFilteredTransactions(transactions, period).filter(
    (transaction) => transaction.type === 'income' || transaction.type === 'expense',
  );

  if (filtered.length === 0) {
    return [];
  }

  const rangeStart = period === 'all-time'
    ? toMonthStart(filtered.reduce((earliest, transaction) => (
      transaction.date < earliest ? transaction.date : earliest
    ), filtered[0].date))
    : toMonthStart(start);
  const rangeEnd = period === 'all-time'
    ? toMonthStart(filtered.reduce((latest, transaction) => (
      transaction.date > latest ? transaction.date : latest
    ), filtered[0].date))
    : toMonthStart(end);

  const pointsByMonth = new Map<string, MonthlyIncomeExpensePoint>();

  for (
    const current = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    current <= rangeEnd;
    current.setMonth(current.getMonth() + 1)
  ) {
    const key = monthKey(current);
    pointsByMonth.set(key, {
      monthKey: key,
      monthLabel: formatMonthLabel(current),
      income: 0,
      expenses: 0,
      net: 0,
    });
  }

  for (const transaction of filtered) {
    const key = monthKey(toMonthStart(transaction.date));
    const point = pointsByMonth.get(key);
    if (!point) {
      continue;
    }

    if (transaction.type === 'income') {
      point.income += transaction.amount;
    } else if (transaction.type === 'expense') {
      point.expenses += Math.abs(transaction.amount);
    }
  }

  return [...pointsByMonth.values()].map((point) => ({
    ...point,
    net: point.income - point.expenses,
  }));
}

export function buildCategoryPieSeries(
  transactions: TransactionWithDetails[],
  period: DateRangePeriod,
  type: 'income' | 'expense',
): AnalyticsPieDatum[] {
  const filtered = getFilteredTransactions(transactions, period).filter((transaction) => transaction.type === type);

  const totalsByCategory = new Map<string, { label: string; value: number }>();
  for (const transaction of filtered) {
    const existing = totalsByCategory.get(transaction.categoryId) ?? {
      label: transaction.category.name,
      value: 0,
    };
    const amount = type === 'expense' ? Math.abs(transaction.amount) : transaction.amount;
    existing.value += amount;
    totalsByCategory.set(transaction.categoryId, existing);
  }

  const sorted = [...totalsByCategory.entries()]
    .map(([id, data]) => ({ id, ...data }))
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value);

  const palette = type === 'income' ? INCOME_PIE_COLORS : EXPENSE_PIE_COLORS;
  return sorted.map((entry, index) => ({
    id: entry.id,
    label: entry.label,
    value: Number(entry.value.toFixed(2)),
    color: palette[index % palette.length],
  }));
}

export function buildGoalSavedSeries(goalProgress: GoalProgress[]): GoalSavedPoint[] {
  return goalProgress
    .map((entry) => ({
      goalId: entry.goal.id,
      goalLabel: entry.goal.name,
      saved: Math.max(0, Number(entry.currentAmount.toFixed(2))),
    }))
    .sort((left, right) => right.saved - left.saved);
}

// ── Chart palette ──────────────────────────────────────────────
// Keep in sync with src/index.css @theme color variables.

export const ANALYTICS_COLORS = {
  bg: '#09090b',
  surface: '#121215',
  border: '#27272a',
  text: '#e9f0ef',
  textSecondary: '#9aa8a6',
  accent: '#55aec8',
  goal: '#6aa7ff',
  income: '#4fd08a',
  expense: '#ef6a6a',
  transfer: '#7e9ab3',
  split: '#c7a2ff',
  warning: '#f5bb00',
} as const;

const INCOME_PIE_COLORS = [
  '#1f6f4b',
  '#2f9666',
  ANALYTICS_COLORS.income,
  '#69d99b',
  '#88e3b0',
  '#a8ecc6',
] as const;

const EXPENSE_PIE_COLORS = [
  '#a33c3c',
  '#c45252',
  ANALYTICS_COLORS.expense,
  '#f18585',
  '#f59d9d',
  '#f8b6b6',
] as const;

const NODE_COLORS = {
  incomeCategory: ANALYTICS_COLORS.income,
  grossIncome: ANALYTICS_COLORS.income,
  expenseTotal: ANALYTICS_COLORS.expense,
  expenseCategory: ANALYTICS_COLORS.expense,
  savings: ANALYTICS_COLORS.goal,
  savingsGoal: ANALYTICS_COLORS.goal,
  savingsUnallocated: ANALYTICS_COLORS.textSecondary,
  shortfall: ANALYTICS_COLORS.warning,
  fallback: ANALYTICS_COLORS.textSecondary,
} as const;

// ── Main builder ──────────────────────────────────────────────

export function buildSankeyData(
  transactions: TransactionWithDetails[],
  period: DateRangePeriod,
): SankeyResult {
  const { start, end } = getDateRange(period);

  // 1. Filter by date range
  const filtered = transactions.filter((t) => t.date >= start && t.date <= end);

  // 2. Separate by type
  const incomeTxs = filtered.filter((t) => t.type === 'income');
  const expenseTxs = filtered.filter((t) => t.type === 'expense');
  const transferTxs = filtered.filter((t) => t.type === 'transfer');

  // 3. Aggregate income by category
  const incomeByCategory = new Map<string, { name: string; amount: number }>();
  for (const t of incomeTxs) {
    const entry = incomeByCategory.get(t.categoryId) ?? { name: t.category.name, amount: 0 };
    entry.amount += t.amount;
    incomeByCategory.set(t.categoryId, entry);
  }

  // 4. Aggregate expenses by category, tracking group
  const expenseByCategory = new Map<string, { name: string; groupId: string; amount: number }>();
  for (const t of expenseTxs) {
    const entry = expenseByCategory.get(t.categoryId) ?? {
      name: t.category.name,
      groupId: t.category.groupId ?? 'other',
      amount: 0,
    };
    entry.amount += Math.abs(t.amount); // expenses are negative
    expenseByCategory.set(t.categoryId, entry);
  }

  // 5. Aggregate transfers by category (deduplicate paired legs)
  const seenPairIds = new Set<string>();
  const transferByCategory = new Map<string, { name: string; amount: number }>();
  for (const t of transferTxs) {
    if (t.transferPairId) {
      if (seenPairIds.has(t.transferPairId)) continue;
      seenPairIds.add(t.transferPairId);
    }
    const entry = transferByCategory.get(t.categoryId) ?? { name: t.category.name, amount: 0 };
    entry.amount += Math.abs(t.amount);
    transferByCategory.set(t.categoryId, entry);
  }

  // 6. Compute totals
  const totalIncome = [...incomeByCategory.values()].reduce((s, c) => s + c.amount, 0);
  const totalExpenses = [...expenseByCategory.values()].reduce((s, c) => s + c.amount, 0);
  const totalTransfers = [...transferByCategory.values()].reduce((s, c) => s + c.amount, 0);
  const netSavings = totalIncome - totalExpenses;

  const savingsByGoal = new Map<string, { name: string; amount: number }>();
  for (const transaction of filtered) {
    if (!transaction.goalId || transaction.amount <= 0) {
      continue;
    }

    const existing = savingsByGoal.get(transaction.goalId) ?? {
      name: transaction.goal?.name ?? 'Goal',
      amount: 0,
    };
    existing.amount += transaction.amount;
    savingsByGoal.set(transaction.goalId, existing);
  }

  const summary: PeriodSummary = { totalIncome, totalExpenses, totalTransfers, netSavings };

  // If nothing to show, return empty
  if (totalIncome === 0 && totalExpenses === 0) {
    return { nodes: [], links: [], summary };
  }

  // 7. Build nodes & links
  const nodes: SankeyNodeInput[] = [];
  const links: DefaultLink[] = [];

  // ── Income category nodes → gross income ──
  for (const [catId, data] of incomeByCategory) {
    if (data.amount <= 0) continue;
    nodes.push({
      id: `income:${catId}`,
      nodeLabel: data.name,
      nodeColor: NODE_COLORS.incomeCategory,
    });
    links.push({ source: `income:${catId}`, target: 'hub:gross-income', value: data.amount });
  }

  // ── Shortfall node (if expenses exceed income) ──
  if (netSavings < 0) {
    nodes.push({
      id: 'special:shortfall',
      nodeLabel: 'Shortfall',
      nodeColor: NODE_COLORS.shortfall,
    });
    links.push({
      source: 'special:shortfall',
      target: 'hub:gross-income',
      value: Math.abs(netSavings),
    });
  }

  // ── Gross income hub ──
  if (totalIncome > 0 || totalExpenses > 0) {
    nodes.push({
      id: 'hub:gross-income',
      nodeLabel: 'Gross Income',
      nodeColor: NODE_COLORS.grossIncome,
    });
  }

  // ── Expenses split: gross income → total → categories ──
  if (totalExpenses > 0) {
    nodes.push({
      id: 'expense:total',
      nodeLabel: 'Total Expenses',
      nodeColor: NODE_COLORS.expenseTotal,
    });
    links.push({
      source: 'hub:gross-income',
      target: 'expense:total',
      value: totalExpenses,
    });
  }

  // ── Individual expense category nodes ──
  const expenseEntries = [...expenseByCategory.entries()].sort(([, left], [, right]) => right.amount - left.amount);
  for (const [catId, data] of expenseEntries) {
    if (data.amount <= 0) continue;
    nodes.push({
      id: `expense:${catId}`,
      nodeLabel: data.name,
      nodeColor: NODE_COLORS.expenseCategory,
    });
    links.push({ source: 'expense:total', target: `expense:${catId}`, value: data.amount });
  }

  // ── Savings (surplus) and goal allocation ──
  if (netSavings > 0) {
    nodes.push({
      id: 'special:savings',
      nodeLabel: 'Savings',
      nodeColor: NODE_COLORS.savings,
    });
    links.push({ source: 'hub:gross-income', target: 'special:savings', value: netSavings });

    const goalSavingsEntries = [...savingsByGoal.entries()]
      .map(([goalId, data]) => ({ goalId, ...data }))
      .filter((entry) => entry.amount > 0)
      .sort((left, right) => right.amount - left.amount);

    const totalGoalContributions = goalSavingsEntries.reduce((sum, entry) => sum + entry.amount, 0);
    if (totalGoalContributions > 0) {
      const allocatedToGoals = Math.min(netSavings, totalGoalContributions);
      let allocatedSoFar = 0;

      goalSavingsEntries.forEach((entry, index) => {
        const isLast = index === goalSavingsEntries.length - 1;
        const proportional = (entry.amount / totalGoalContributions) * allocatedToGoals;
        const value = isLast
          ? Math.max(0, allocatedToGoals - allocatedSoFar)
          : Math.max(0, Math.round(proportional * 100) / 100);

        if (value <= 0) {
          return;
        }

        allocatedSoFar += value;
        nodes.push({
          id: `goal-savings:${entry.goalId}`,
          nodeLabel: entry.name,
          nodeColor: NODE_COLORS.savingsGoal,
        });
        links.push({
          source: 'special:savings',
          target: `goal-savings:${entry.goalId}`,
          value,
        });
      });

      const remainingSavings = Math.max(0, Math.round((netSavings - allocatedSoFar) * 100) / 100);
      if (remainingSavings > 0) {
        nodes.push({
          id: 'special:savings-unallocated',
          nodeLabel: 'Unallocated',
          nodeColor: NODE_COLORS.savingsUnallocated,
        });
        links.push({
          source: 'special:savings',
          target: 'special:savings-unallocated',
          value: remainingSavings,
        });
      }
    }
  }

  return { nodes, links, summary };
}
