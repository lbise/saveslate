import type { TransactionWithDetails } from '../types';
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

const NODE_COLORS = {
  incomeCategory: ANALYTICS_COLORS.income,
  grossIncome: ANALYTICS_COLORS.accent,
  expenseTotal: ANALYTICS_COLORS.expense,
  savings: ANALYTICS_COLORS.goal,
  shortfall: ANALYTICS_COLORS.warning,
  fallback: ANALYTICS_COLORS.textSecondary,
} as const;

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  living: ANALYTICS_COLORS.accent,
  lifestyle: ANALYTICS_COLORS.split,
  finance: ANALYTICS_COLORS.goal,
  transfers: ANALYTICS_COLORS.transfer,
  income: ANALYTICS_COLORS.income,
};

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
      nodeColor: EXPENSE_CATEGORY_COLORS[data.groupId] ?? NODE_COLORS.fallback,
    });
    links.push({ source: 'expense:total', target: `expense:${catId}`, value: data.amount });
  }

  // ── Savings (surplus) ──
  if (netSavings > 0) {
    nodes.push({
      id: 'special:savings',
      nodeLabel: 'Savings',
      nodeColor: NODE_COLORS.savings,
    });
    links.push({ source: 'hub:gross-income', target: 'special:savings', value: netSavings });
  }

  return { nodes, links, summary };
}
