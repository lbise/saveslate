import type { TransactionWithDetails } from '../types';
import type { DefaultLink } from '@nivo/sankey';
import { getCategoryGroupById } from '../data/mock/category-groups';

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

// ── Node colours ──────────────────────────────────────────────
// Matches CSS variables from index.css (dark-only palette)

const COLORS = {
  income: '#4fd08a',
  incomeHub: '#3ab876',
  netSavings: '#55aec8',
  deficit: '#ef6a6a',

  // Category groups (bright, used for group nodes)
  living: '#e8a87c',
  lifestyle: '#c7a2ff',
  finance: '#6aa7ff',
  transfers: '#7e9ab3',

  // Individual categories per group (slightly muted)
  livingCat: '#d4956a',
  lifestyleCat: '#b48ce6',
  financeCat: '#5590d9',
  transfersCat: '#6b8999',

  fallback: '#9aa8a6',
} as const;

const GROUP_NODE_COLOR: Record<string, string> = {
  living: COLORS.living,
  lifestyle: COLORS.lifestyle,
  finance: COLORS.finance,
  transfers: COLORS.transfers,
};

const GROUP_CAT_COLOR: Record<string, string> = {
  living: COLORS.livingCat,
  lifestyle: COLORS.lifestyleCat,
  finance: COLORS.financeCat,
  transfers: COLORS.transfersCat,
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
  const totalOutflows = totalExpenses + totalTransfers;
  const netSavings = totalIncome - totalOutflows;

  const summary: PeriodSummary = { totalIncome, totalExpenses, totalTransfers, netSavings };

  // If nothing to show, return empty
  if (totalIncome === 0 && totalOutflows === 0) {
    return { nodes: [], links: [], summary };
  }

  // 7. Build nodes & links
  const nodes: SankeyNodeInput[] = [];
  const links: DefaultLink[] = [];

  // ── Income category nodes → hub ──
  for (const [catId, data] of incomeByCategory) {
    if (data.amount <= 0) continue;
    nodes.push({ id: `income:${catId}`, nodeLabel: data.name, nodeColor: COLORS.income });
    links.push({ source: `income:${catId}`, target: 'hub:income', value: data.amount });
  }

  // ── Deficit node (if outflows exceed income) ──
  if (netSavings < 0) {
    nodes.push({ id: 'special:deficit', nodeLabel: 'Shortfall', nodeColor: COLORS.deficit });
    links.push({ source: 'special:deficit', target: 'hub:income', value: Math.abs(netSavings) });
  }

  // ── Hub node ──
  if (totalIncome > 0 || totalOutflows > 0) {
    nodes.push({ id: 'hub:income', nodeLabel: 'Total Income', nodeColor: COLORS.incomeHub });
  }

  // ── Expense groups ──
  const expenseByGroup = new Map<string, number>();
  for (const [, data] of expenseByCategory) {
    expenseByGroup.set(data.groupId, (expenseByGroup.get(data.groupId) ?? 0) + data.amount);
  }

  const EXPENSE_GROUP_ORDER = ['living', 'lifestyle', 'finance'];
  for (const groupId of EXPENSE_GROUP_ORDER) {
    const groupTotal = expenseByGroup.get(groupId);
    if (!groupTotal || groupTotal <= 0) continue;

    const group = getCategoryGroupById(groupId);
    nodes.push({
      id: `group:${groupId}`,
      nodeLabel: group?.name ?? groupId,
      nodeColor: GROUP_NODE_COLOR[groupId] ?? COLORS.fallback,
    });
    links.push({ source: 'hub:income', target: `group:${groupId}`, value: groupTotal });
  }

  // Handle expenses in unknown groups (custom categories)
  for (const groupId of expenseByGroup.keys()) {
    if (EXPENSE_GROUP_ORDER.includes(groupId)) continue;
    const groupTotal = expenseByGroup.get(groupId)!;
    if (groupTotal <= 0) continue;

    const group = getCategoryGroupById(groupId);
    nodes.push({
      id: `group:${groupId}`,
      nodeLabel: group?.name ?? 'Other',
      nodeColor: COLORS.fallback,
    });
    links.push({ source: 'hub:income', target: `group:${groupId}`, value: groupTotal });
  }

  // ── Individual expense category nodes ──
  for (const [catId, data] of expenseByCategory) {
    if (data.amount <= 0) continue;
    nodes.push({
      id: `expense:${catId}`,
      nodeLabel: data.name,
      nodeColor: GROUP_CAT_COLOR[data.groupId] ?? COLORS.fallback,
    });
    links.push({ source: `group:${data.groupId}`, target: `expense:${catId}`, value: data.amount });
  }

  // ── Transfers group + individual transfer categories ──
  if (totalTransfers > 0) {
    nodes.push({
      id: 'group:transfers',
      nodeLabel: 'Transfers',
      nodeColor: COLORS.transfers,
    });
    links.push({ source: 'hub:income', target: 'group:transfers', value: totalTransfers });

    for (const [catId, data] of transferByCategory) {
      if (data.amount <= 0) continue;
      nodes.push({
        id: `transfer:${catId}`,
        nodeLabel: data.name,
        nodeColor: COLORS.transfersCat,
      });
      links.push({ source: 'group:transfers', target: `transfer:${catId}`, value: data.amount });
    }
  }

  // ── Net savings (surplus) ──
  if (netSavings > 0) {
    nodes.push({ id: 'special:net-savings', nodeLabel: 'Net Savings', nodeColor: COLORS.netSavings });
    links.push({ source: 'hub:income', target: 'special:net-savings', value: netSavings });
  }

  return { nodes, links, summary };
}
