import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getDateRange,
  buildMonthlyIncomeExpenseSeries,
  buildCategoryPieSeries,
  buildGoalSavedSeries,
  buildSankeyData,
  DATE_RANGE_OPTIONS,
  ANALYTICS_COLORS,
} from '../../src/lib/analytics';
import type { TransactionWithDetails, GoalProgress, Category, Account } from '../../src/types';
import type {
  DateRangePeriod,
} from '../../src/lib/analytics';

// ── Factory helpers ─────────────────────────────────────────────

const defaultCategory: Category = { id: 'cat-food', name: 'Food', icon: 'Utensils' };
const defaultAccount: Account = {
  id: 'acc-1',
  name: 'Main',
  type: 'checking',
  balance: 1000,
  currency: 'CHF',
  icon: 'Wallet',
};

function makeTxn(overrides: Partial<TransactionWithDetails> = {}): TransactionWithDetails {
  return {
    id: 'tx-1',
    amount: -50,
    currency: 'CHF',
    categoryId: 'cat-food',
    description: 'Test transaction',
    date: '2025-06-10',
    accountId: 'acc-1',
    type: 'expense',
    category: defaultCategory,
    account: defaultAccount,
    ...overrides,
  };
}

function makeGoalProgress(overrides: Partial<GoalProgress> = {}): GoalProgress {
  return {
    goal: {
      id: 'goal-1',
      name: 'Emergency Fund',
      icon: 'Shield',
      targetAmount: 10000,
      createdAt: '2025-01-01',
    },
    currentAmount: 500,
    percentage: 5,
    transactionCount: 3,
    ...overrides,
  };
}

// ── Test suite ──────────────────────────────────────────────────

describe('analytics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Constants ─────────────────────────────────────────────────

  describe('DATE_RANGE_OPTIONS', () => {
    it('contains all six period options', () => {
      expect(DATE_RANGE_OPTIONS).toHaveLength(6);
      const values = DATE_RANGE_OPTIONS.map((o) => o.value);
      expect(values).toEqual([
        'this-month',
        'last-month',
        'last-3-months',
        'last-6-months',
        'this-year',
        'all-time',
      ]);
    });

    it('has human-readable labels', () => {
      for (const option of DATE_RANGE_OPTIONS) {
        expect(option.label).toBeTruthy();
        expect(typeof option.label).toBe('string');
      }
    });
  });

  describe('ANALYTICS_COLORS', () => {
    it('includes expected color keys', () => {
      expect(ANALYTICS_COLORS).toHaveProperty('income');
      expect(ANALYTICS_COLORS).toHaveProperty('expense');
      expect(ANALYTICS_COLORS).toHaveProperty('accent');
      expect(ANALYTICS_COLORS).toHaveProperty('goal');
      expect(ANALYTICS_COLORS).toHaveProperty('transfer');
    });

    it('contains valid hex color values', () => {
      for (const color of Object.values(ANALYTICS_COLORS)) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  // ── getDateRange ──────────────────────────────────────────────

  describe('getDateRange', () => {
    it('this-month: returns first of current month to today', () => {
      const range = getDateRange('this-month');
      expect(range.start).toBe('2025-06-01');
      expect(range.end).toBe('2025-06-15');
    });

    it('last-month: returns first to last day of previous month', () => {
      const range = getDateRange('last-month');
      expect(range.start).toBe('2025-05-01');
      expect(range.end).toBe('2025-05-31');
    });

    it('last-3-months: returns first of (current - 2) months to today', () => {
      const range = getDateRange('last-3-months');
      expect(range.start).toBe('2025-04-01');
      expect(range.end).toBe('2025-06-15');
    });

    it('last-6-months: returns first of (current - 5) months to today', () => {
      const range = getDateRange('last-6-months');
      expect(range.start).toBe('2025-01-01');
      expect(range.end).toBe('2025-06-15');
    });

    it('this-year: returns Jan 1 of current year to today', () => {
      const range = getDateRange('this-year');
      expect(range.start).toBe('2025-01-01');
      expect(range.end).toBe('2025-06-15');
    });

    it('all-time: returns 1970-01-01 to today', () => {
      const range = getDateRange('all-time');
      expect(range.start).toBe('1970-01-01');
      expect(range.end).toBe('2025-06-15');
    });

    it('handles year boundary for last-month when current month is January', () => {
      vi.setSystemTime(new Date('2025-01-20T12:00:00Z'));
      const range = getDateRange('last-month');
      expect(range.start).toBe('2024-12-01');
      expect(range.end).toBe('2024-12-31');
    });

    it('handles year boundary for last-3-months crossing year boundary', () => {
      vi.setSystemTime(new Date('2025-02-10T12:00:00Z'));
      const range = getDateRange('last-3-months');
      expect(range.start).toBe('2024-12-01');
      expect(range.end).toBe('2025-02-10');
    });

    it('handles year boundary for last-6-months crossing year boundary', () => {
      vi.setSystemTime(new Date('2025-03-05T12:00:00Z'));
      const range = getDateRange('last-6-months');
      expect(range.start).toBe('2024-10-01');
      expect(range.end).toBe('2025-03-05');
    });

    it('all periods return ISO date strings in YYYY-MM-DD format', () => {
      const periods: DateRangePeriod[] = [
        'this-month',
        'last-month',
        'last-3-months',
        'last-6-months',
        'this-year',
        'all-time',
      ];
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
      for (const period of periods) {
        const range = getDateRange(period);
        expect(range.start).toMatch(isoDatePattern);
        expect(range.end).toMatch(isoDatePattern);
      }
    });

    it('last-month handles February correctly in a non-leap year', () => {
      vi.setSystemTime(new Date('2025-03-15T12:00:00Z'));
      const range = getDateRange('last-month');
      expect(range.start).toBe('2025-02-01');
      expect(range.end).toBe('2025-02-28');
    });

    it('last-month handles February correctly in a leap year', () => {
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
      const range = getDateRange('last-month');
      expect(range.start).toBe('2024-02-01');
      expect(range.end).toBe('2024-02-29');
    });
  });

  // ── buildMonthlyIncomeExpenseSeries ───────────────────────────

  describe('buildMonthlyIncomeExpenseSeries', () => {
    it('returns empty array when no transactions provided', () => {
      const result = buildMonthlyIncomeExpenseSeries([], 'this-month');
      expect(result).toEqual([]);
    });

    it('returns empty array when no transactions match the period', () => {
      const txn = makeTxn({ date: '2024-01-10', type: 'expense', amount: -100 });
      const result = buildMonthlyIncomeExpenseSeries([txn], 'this-month');
      expect(result).toEqual([]);
    });

    it('returns empty array when only transfer transactions exist', () => {
      const txn = makeTxn({ date: '2025-06-10', type: 'transfer', amount: -200 });
      const result = buildMonthlyIncomeExpenseSeries([txn], 'this-month');
      expect(result).toEqual([]);
    });

    it('computes a single month with one expense', () => {
      const txn = makeTxn({ date: '2025-06-10', type: 'expense', amount: -100 });
      const result = buildMonthlyIncomeExpenseSeries([txn], 'this-month');
      expect(result).toHaveLength(1);
      expect(result[0].monthKey).toBe('2025-06');
      expect(result[0].income).toBe(0);
      expect(result[0].expenses).toBe(100);
      expect(result[0].net).toBe(-100);
    });

    it('computes a single month with one income', () => {
      const txn = makeTxn({
        id: 'tx-inc',
        date: '2025-06-05',
        type: 'income',
        amount: 3000,
        categoryId: 'cat-salary',
        category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
      });
      const result = buildMonthlyIncomeExpenseSeries([txn], 'this-month');
      expect(result).toHaveLength(1);
      expect(result[0].income).toBe(3000);
      expect(result[0].expenses).toBe(0);
      expect(result[0].net).toBe(3000);
    });

    it('sums income and expenses in the same month', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'income', amount: 5000, categoryId: 'cat-salary', category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' } }),
        makeTxn({ id: 'tx-2', date: '2025-06-05', type: 'expense', amount: -200 }),
        makeTxn({ id: 'tx-3', date: '2025-06-10', type: 'expense', amount: -300 }),
      ];
      const result = buildMonthlyIncomeExpenseSeries(txns, 'this-month');
      expect(result).toHaveLength(1);
      expect(result[0].income).toBe(5000);
      expect(result[0].expenses).toBe(500);
      expect(result[0].net).toBe(4500);
    });

    it('creates entries for all months in range, filling gaps with zeros', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-04-10', type: 'expense', amount: -100 }),
        makeTxn({ id: 'tx-2', date: '2025-06-10', type: 'expense', amount: -200 }),
      ];
      const result = buildMonthlyIncomeExpenseSeries(txns, 'last-3-months');
      expect(result).toHaveLength(3);
      expect(result.map((p) => p.monthKey)).toEqual(['2025-04', '2025-05', '2025-06']);
      // May should have zero values
      expect(result[1].income).toBe(0);
      expect(result[1].expenses).toBe(0);
      expect(result[1].net).toBe(0);
    });

    it('excludes transfer transactions from the series', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'income', amount: 5000, categoryId: 'cat-salary', category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' } }),
        makeTxn({ id: 'tx-2', date: '2025-06-05', type: 'transfer', amount: -1000, categoryId: 'cat-transfer', category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' } }),
        makeTxn({ id: 'tx-3', date: '2025-06-10', type: 'expense', amount: -200 }),
      ];
      const result = buildMonthlyIncomeExpenseSeries(txns, 'this-month');
      expect(result).toHaveLength(1);
      expect(result[0].income).toBe(5000);
      expect(result[0].expenses).toBe(200);
      expect(result[0].net).toBe(4800);
    });

    it('spans multiple months correctly', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-04-15', type: 'income', amount: 1000, categoryId: 'cat-salary', category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' } }),
        makeTxn({ id: 'tx-2', date: '2025-05-20', type: 'expense', amount: -500 }),
        makeTxn({ id: 'tx-3', date: '2025-06-10', type: 'income', amount: 2000, categoryId: 'cat-salary', category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' } }),
      ];
      const result = buildMonthlyIncomeExpenseSeries(txns, 'last-3-months');
      expect(result).toHaveLength(3);

      expect(result[0].monthKey).toBe('2025-04');
      expect(result[0].income).toBe(1000);
      expect(result[0].expenses).toBe(0);

      expect(result[1].monthKey).toBe('2025-05');
      expect(result[1].income).toBe(0);
      expect(result[1].expenses).toBe(500);

      expect(result[2].monthKey).toBe('2025-06');
      expect(result[2].income).toBe(2000);
      expect(result[2].expenses).toBe(0);
    });

    it('all-time range spans from earliest to latest transaction month', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-02-15', type: 'expense', amount: -100 }),
        makeTxn({ id: 'tx-2', date: '2025-05-20', type: 'income', amount: 500, categoryId: 'cat-salary', category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' } }),
      ];
      const result = buildMonthlyIncomeExpenseSeries(txns, 'all-time');
      expect(result).toHaveLength(4); // Feb, Mar, Apr, May
      expect(result[0].monthKey).toBe('2025-02');
      expect(result[3].monthKey).toBe('2025-05');
      // Gaps filled
      expect(result[1].expenses).toBe(0);
      expect(result[2].expenses).toBe(0);
    });

    it('each point has a monthLabel string', () => {
      const txn = makeTxn({ date: '2025-06-10', type: 'expense', amount: -50 });
      const result = buildMonthlyIncomeExpenseSeries([txn], 'this-month');
      expect(result[0].monthLabel).toBeTruthy();
      expect(typeof result[0].monthLabel).toBe('string');
    });
  });

  // ── buildCategoryPieSeries ────────────────────────────────────

  describe('buildCategoryPieSeries', () => {
    it('returns empty array when no transactions provided', () => {
      const result = buildCategoryPieSeries([], 'this-month', 'expense');
      expect(result).toEqual([]);
    });

    it('returns empty array when no transactions match the type', () => {
      const txn = makeTxn({ date: '2025-06-10', type: 'income', amount: 1000 });
      const result = buildCategoryPieSeries([txn], 'this-month', 'expense');
      expect(result).toEqual([]);
    });

    it('returns empty array when transactions are outside the period', () => {
      const txn = makeTxn({ date: '2024-01-01', type: 'expense', amount: -100 });
      const result = buildCategoryPieSeries([txn], 'this-month', 'expense');
      expect(result).toEqual([]);
    });

    it('filters out transfer transactions', () => {
      const txn = makeTxn({ date: '2025-06-10', type: 'transfer', amount: -500 });
      const result = buildCategoryPieSeries([txn], 'this-month', 'expense');
      expect(result).toEqual([]);
    });

    it('groups expense transactions by category with absolute amounts', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'expense', amount: -100, categoryId: 'cat-food', category: { id: 'cat-food', name: 'Food', icon: 'Utensils' } }),
        makeTxn({ id: 'tx-2', date: '2025-06-05', type: 'expense', amount: -200, categoryId: 'cat-food', category: { id: 'cat-food', name: 'Food', icon: 'Utensils' } }),
        makeTxn({ id: 'tx-3', date: '2025-06-10', type: 'expense', amount: -50, categoryId: 'cat-transport', category: { id: 'cat-transport', name: 'Transport', icon: 'Car' } }),
      ];
      const result = buildCategoryPieSeries(txns, 'this-month', 'expense');
      expect(result).toHaveLength(2);
      // Sorted descending
      expect(result[0].id).toBe('cat-food');
      expect(result[0].label).toBe('Food');
      expect(result[0].value).toBe(300);
      expect(result[1].id).toBe('cat-transport');
      expect(result[1].value).toBe(50);
    });

    it('groups income transactions by category', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'income', amount: 5000, categoryId: 'cat-salary', category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' } }),
        makeTxn({ id: 'tx-2', date: '2025-06-10', type: 'income', amount: 200, categoryId: 'cat-freelance', category: { id: 'cat-freelance', name: 'Freelance', icon: 'Laptop' } }),
      ];
      const result = buildCategoryPieSeries(txns, 'this-month', 'income');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cat-salary');
      expect(result[0].value).toBe(5000);
      expect(result[1].id).toBe('cat-freelance');
      expect(result[1].value).toBe(200);
    });

    it('sorts results descending by value', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'expense', amount: -50, categoryId: 'cat-a', category: { id: 'cat-a', name: 'A', icon: 'X' } }),
        makeTxn({ id: 'tx-2', date: '2025-06-02', type: 'expense', amount: -300, categoryId: 'cat-b', category: { id: 'cat-b', name: 'B', icon: 'X' } }),
        makeTxn({ id: 'tx-3', date: '2025-06-03', type: 'expense', amount: -150, categoryId: 'cat-c', category: { id: 'cat-c', name: 'C', icon: 'X' } }),
      ];
      const result = buildCategoryPieSeries(txns, 'this-month', 'expense');
      expect(result[0].value).toBe(300);
      expect(result[1].value).toBe(150);
      expect(result[2].value).toBe(50);
    });

    it('assigns colors from the expense palette', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'expense', amount: -100, categoryId: 'cat-a', category: { id: 'cat-a', name: 'A', icon: 'X' } }),
        makeTxn({ id: 'tx-2', date: '2025-06-02', type: 'expense', amount: -50, categoryId: 'cat-b', category: { id: 'cat-b', name: 'B', icon: 'X' } }),
      ];
      const result = buildCategoryPieSeries(txns, 'this-month', 'expense');
      for (const entry of result) {
        expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('assigns colors from the income palette for income type', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'income', amount: 1000, categoryId: 'cat-salary', category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' } }),
      ];
      const result = buildCategoryPieSeries(txns, 'this-month', 'income');
      expect(result[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('cycles colors when categories exceed palette size', () => {
      const txns = Array.from({ length: 8 }, (_, i) =>
        makeTxn({
          id: `tx-${i}`,
          date: '2025-06-01',
          type: 'expense',
          amount: -(100 - i * 10),
          categoryId: `cat-${i}`,
          category: { id: `cat-${i}`, name: `Cat ${i}`, icon: 'X' },
        }),
      );
      const result = buildCategoryPieSeries(txns, 'this-month', 'expense');
      expect(result).toHaveLength(8);
      // Colors cycle: index 6 and index 0 should have the same color
      expect(result[6].color).toBe(result[0].color);
    });

    it('filters out zero-value categories', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'expense', amount: -100, categoryId: 'cat-a', category: { id: 'cat-a', name: 'A', icon: 'X' } }),
        // Two transactions that cancel out to zero won't produce zero since we use Math.abs
        // But a zero-amount expense would
        makeTxn({ id: 'tx-2', date: '2025-06-02', type: 'expense', amount: 0, categoryId: 'cat-b', category: { id: 'cat-b', name: 'B', icon: 'X' } }),
      ];
      const result = buildCategoryPieSeries(txns, 'this-month', 'expense');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-a');
    });

    it('returns values rounded to 2 decimal places', () => {
      const txns = [
        makeTxn({ id: 'tx-1', date: '2025-06-01', type: 'expense', amount: -33.333, categoryId: 'cat-a', category: { id: 'cat-a', name: 'A', icon: 'X' } }),
        makeTxn({ id: 'tx-2', date: '2025-06-02', type: 'expense', amount: -33.333, categoryId: 'cat-a', category: { id: 'cat-a', name: 'A', icon: 'X' } }),
        makeTxn({ id: 'tx-3', date: '2025-06-03', type: 'expense', amount: -33.334, categoryId: 'cat-a', category: { id: 'cat-a', name: 'A', icon: 'X' } }),
      ];
      const result = buildCategoryPieSeries(txns, 'this-month', 'expense');
      // 33.333 + 33.333 + 33.334 = 100.0 => toFixed(2) => 100
      expect(result[0].value).toBe(100);
    });
  });

  // ── buildGoalSavedSeries ──────────────────────────────────────

  describe('buildGoalSavedSeries', () => {
    it('returns empty array for empty input', () => {
      const result = buildGoalSavedSeries([]);
      expect(result).toEqual([]);
    });

    it('maps goal progress entries to GoalSavedPoint', () => {
      const progress = [makeGoalProgress({ currentAmount: 500 })];
      const result = buildGoalSavedSeries(progress);
      expect(result).toHaveLength(1);
      expect(result[0].goalId).toBe('goal-1');
      expect(result[0].goalLabel).toBe('Emergency Fund');
      expect(result[0].saved).toBe(500);
    });

    it('sorts results descending by saved amount', () => {
      const progress = [
        makeGoalProgress({
          goal: { id: 'goal-a', name: 'Small', icon: 'X', targetAmount: 100, createdAt: '2025-01-01' },
          currentAmount: 50,
        }),
        makeGoalProgress({
          goal: { id: 'goal-b', name: 'Big', icon: 'X', targetAmount: 10000, createdAt: '2025-01-01' },
          currentAmount: 5000,
        }),
        makeGoalProgress({
          goal: { id: 'goal-c', name: 'Medium', icon: 'X', targetAmount: 1000, createdAt: '2025-01-01' },
          currentAmount: 300,
        }),
      ];
      const result = buildGoalSavedSeries(progress);
      expect(result[0].goalId).toBe('goal-b');
      expect(result[0].saved).toBe(5000);
      expect(result[1].goalId).toBe('goal-c');
      expect(result[1].saved).toBe(300);
      expect(result[2].goalId).toBe('goal-a');
      expect(result[2].saved).toBe(50);
    });

    it('clamps negative currentAmount to 0', () => {
      const progress = [makeGoalProgress({ currentAmount: -200 })];
      const result = buildGoalSavedSeries(progress);
      expect(result[0].saved).toBe(0);
    });

    it('handles zero currentAmount', () => {
      const progress = [makeGoalProgress({ currentAmount: 0 })];
      const result = buildGoalSavedSeries(progress);
      expect(result[0].saved).toBe(0);
    });

    it('rounds saved to 2 decimal places', () => {
      const progress = [makeGoalProgress({ currentAmount: 123.456 })];
      const result = buildGoalSavedSeries(progress);
      expect(result[0].saved).toBe(123.46);
    });

    it('handles multiple entries with mixed positive and negative amounts', () => {
      const progress = [
        makeGoalProgress({
          goal: { id: 'goal-a', name: 'A', icon: 'X', targetAmount: 100, createdAt: '2025-01-01' },
          currentAmount: -50,
        }),
        makeGoalProgress({
          goal: { id: 'goal-b', name: 'B', icon: 'X', targetAmount: 100, createdAt: '2025-01-01' },
          currentAmount: 200,
        }),
      ];
      const result = buildGoalSavedSeries(progress);
      // Sorted desc: 200, 0 (clamped from -50)
      expect(result[0]).toMatchObject({ goalId: 'goal-b', saved: 200 });
      expect(result[1]).toMatchObject({ goalId: 'goal-a', saved: 0 });
    });
  });

  // ── buildSankeyData ───────────────────────────────────────────

  describe('buildSankeyData', () => {
    it('returns empty nodes and links when no transactions', () => {
      const result = buildSankeyData([], 'this-month');
      expect(result.nodes).toEqual([]);
      expect(result.links).toEqual([]);
      expect(result.summary).toEqual({
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfers: 0,
        netSavings: 0,
      });
    });

    it('returns empty nodes and links when transactions are outside the period', () => {
      const txn = makeTxn({ date: '2024-01-10' });
      const result = buildSankeyData([txn], 'this-month');
      expect(result.nodes).toEqual([]);
      expect(result.links).toEqual([]);
    });

    it('builds correct structure for income-only transactions', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-05',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      expect(result.summary.totalIncome).toBe(5000);
      expect(result.summary.totalExpenses).toBe(0);
      expect(result.summary.netSavings).toBe(5000);

      // Should have: income:cat-salary, hub:gross-income, special:savings
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('income:cat-salary');
      expect(nodeIds).toContain('hub:gross-income');
      expect(nodeIds).toContain('special:savings');
      // No expense nodes
      expect(nodeIds).not.toContain('expense:total');

      // Links: income → hub, hub → savings
      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'income:cat-salary', target: 'hub:gross-income', value: 5000 }),
      );
      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'hub:gross-income', target: 'special:savings', value: 5000 }),
      );
    });

    it('builds correct structure for expense-only transactions', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-05',
          type: 'expense',
          amount: -300,
          categoryId: 'cat-food',
          category: { id: 'cat-food', name: 'Food', icon: 'Utensils' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      expect(result.summary.totalIncome).toBe(0);
      expect(result.summary.totalExpenses).toBe(300);
      expect(result.summary.netSavings).toBe(-300);

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('hub:gross-income');
      expect(nodeIds).toContain('expense:total');
      expect(nodeIds).toContain('expense:cat-food');
      expect(nodeIds).toContain('special:shortfall');
      // No savings node since netSavings < 0
      expect(nodeIds).not.toContain('special:savings');

      // Shortfall → hub
      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'special:shortfall', target: 'hub:gross-income', value: 300 }),
      );
    });

    it('builds correct structure with mixed income and expenses', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -1000,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        makeTxn({
          id: 'tx-3',
          date: '2025-06-10',
          type: 'expense',
          amount: -500,
          categoryId: 'cat-food',
          category: { id: 'cat-food', name: 'Food', icon: 'Utensils' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      expect(result.summary.totalIncome).toBe(5000);
      expect(result.summary.totalExpenses).toBe(1500);
      expect(result.summary.netSavings).toBe(3500);

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('income:cat-salary');
      expect(nodeIds).toContain('hub:gross-income');
      expect(nodeIds).toContain('expense:total');
      expect(nodeIds).toContain('expense:cat-rent');
      expect(nodeIds).toContain('expense:cat-food');
      expect(nodeIds).toContain('special:savings');

      // No shortfall since income > expenses
      expect(nodeIds).not.toContain('special:shortfall');

      // Verify key links
      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'hub:gross-income', target: 'expense:total', value: 1500 }),
      );
      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'hub:gross-income', target: 'special:savings', value: 3500 }),
      );
    });

    it('creates shortfall node when expenses exceed income', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 1000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-10',
          type: 'expense',
          amount: -3000,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      expect(result.summary.netSavings).toBe(-2000);

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('special:shortfall');
      expect(nodeIds).not.toContain('special:savings');

      const shortfallNode = result.nodes.find((n) => n.id === 'special:shortfall');
      expect(shortfallNode?.nodeLabel).toBe('Shortfall');

      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'special:shortfall', target: 'hub:gross-income', value: 2000 }),
      );
    });

    it('deduplicates transfer pairs by transferPairId', () => {
      const txns = [
        makeTxn({
          id: 'tx-t1',
          date: '2025-06-05',
          type: 'transfer',
          amount: -500,
          categoryId: 'cat-transfer',
          category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' },
          transferPairId: 'pair-1',
          transferPairRole: 'source',
        }),
        makeTxn({
          id: 'tx-t2',
          date: '2025-06-05',
          type: 'transfer',
          amount: 500,
          categoryId: 'cat-transfer',
          category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' },
          transferPairId: 'pair-1',
          transferPairRole: 'destination',
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');
      // Transfers don't create income or expenses
      expect(result.summary.totalTransfers).toBe(500); // Deduplicated
      expect(result.summary.totalIncome).toBe(0);
      expect(result.summary.totalExpenses).toBe(0);
    });

    it('includes transfer amounts in summary totalTransfers', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-05',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-t1',
          date: '2025-06-06',
          type: 'transfer',
          amount: -200,
          categoryId: 'cat-transfer',
          category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');
      expect(result.summary.totalTransfers).toBe(200);
    });

    it('allocates savings to goals proportionally', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -2000,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        // Goal contribution (goalId + amount > 0)
        makeTxn({
          id: 'tx-g1',
          date: '2025-06-10',
          type: 'income',
          amount: 500,
          categoryId: 'cat-savings',
          category: { id: 'cat-savings', name: 'Savings', icon: 'PiggyBank' },
          goalId: 'goal-vacation',
          goal: { id: 'goal-vacation', name: 'Vacation', icon: 'Plane', targetAmount: 2000, createdAt: '2025-01-01' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      // netSavings = 5500 - 2000 = 3500 (income includes goal contribution)
      expect(result.summary.netSavings).toBe(3500);

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('special:savings');
      expect(nodeIds).toContain('goal-savings:goal-vacation');

      // Goal savings link should exist
      const goalLink = result.links.find((l) => l.target === 'goal-savings:goal-vacation');
      expect(goalLink).toBeDefined();
      expect(goalLink!.source).toBe('special:savings');
      expect(goalLink!.value).toBe(500);
    });

    it('creates unallocated savings node when savings exceed goal contributions', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -2000,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        makeTxn({
          id: 'tx-g1',
          date: '2025-06-10',
          type: 'income',
          amount: 200,
          categoryId: 'cat-savings',
          category: { id: 'cat-savings', name: 'Savings', icon: 'PiggyBank' },
          goalId: 'goal-1',
          goal: { id: 'goal-1', name: 'Emergency', icon: 'Shield', targetAmount: 10000, createdAt: '2025-01-01' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      // netSavings = 5200 - 2000 = 3200, goal contributions = 200
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('special:savings-unallocated');

      const unallocatedNode = result.nodes.find((n) => n.id === 'special:savings-unallocated');
      expect(unallocatedNode?.nodeLabel).toBe('Unallocated');

      const unallocatedLink = result.links.find((l) => l.target === 'special:savings-unallocated');
      expect(unallocatedLink).toBeDefined();
      expect(unallocatedLink!.source).toBe('special:savings');
      expect(unallocatedLink!.value).toBe(3000);
    });

    it('does not create unallocated savings when goal contributions match net savings', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 3000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -1000,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        makeTxn({
          id: 'tx-g1',
          date: '2025-06-10',
          type: 'income',
          amount: 2000,
          categoryId: 'cat-savings',
          category: { id: 'cat-savings', name: 'Savings', icon: 'PiggyBank' },
          goalId: 'goal-1',
          goal: { id: 'goal-1', name: 'Emergency', icon: 'Shield', targetAmount: 10000, createdAt: '2025-01-01' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      // netSavings = 5000 - 1000 = 4000, goal contributions = 2000 (capped at netSavings)
      const nodeIds = result.nodes.map((n) => n.id);
      // Allocated 2000 out of 4000, so unallocated = 2000
      expect(nodeIds).toContain('special:savings-unallocated');
    });

    it('caps goal contributions at netSavings', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 1000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -800,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        // Goal contribution exceeds net savings (200)
        makeTxn({
          id: 'tx-g1',
          date: '2025-06-10',
          type: 'income',
          amount: 500,
          categoryId: 'cat-savings',
          category: { id: 'cat-savings', name: 'Savings', icon: 'PiggyBank' },
          goalId: 'goal-1',
          goal: { id: 'goal-1', name: 'Emergency', icon: 'Shield', targetAmount: 10000, createdAt: '2025-01-01' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      // netSavings = 1500 - 800 = 700; goal contributions = 500; capped at min(700, 500) = 500
      const goalLink = result.links.find((l) => l.target === 'goal-savings:goal-1');
      expect(goalLink).toBeDefined();
      expect(goalLink!.value).toBe(500);

      // Unallocated = 700 - 500 = 200
      const unallocatedLink = result.links.find((l) => l.target === 'special:savings-unallocated');
      expect(unallocatedLink).toBeDefined();
      expect(unallocatedLink!.value).toBe(200);
    });

    it('only counts goal contributions with positive amounts', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        // Negative amount with goalId should not count as goal contribution
        makeTxn({
          id: 'tx-g1',
          date: '2025-06-10',
          type: 'expense',
          amount: -100,
          categoryId: 'cat-food',
          category: { id: 'cat-food', name: 'Food', icon: 'Utensils' },
          goalId: 'goal-1',
          goal: { id: 'goal-1', name: 'Emergency', icon: 'Shield', targetAmount: 10000, createdAt: '2025-01-01' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).not.toContain('goal-savings:goal-1');
    });

    it('aggregates multiple income categories', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 4000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'income',
          amount: 500,
          categoryId: 'cat-freelance',
          category: { id: 'cat-freelance', name: 'Freelance', icon: 'Laptop' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('income:cat-salary');
      expect(nodeIds).toContain('income:cat-freelance');

      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'income:cat-salary', target: 'hub:gross-income', value: 4000 }),
      );
      expect(result.links).toContainEqual(
        expect.objectContaining({ source: 'income:cat-freelance', target: 'hub:gross-income', value: 500 }),
      );
    });

    it('aggregates multiple expense categories and sorts them descending', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-02',
          type: 'expense',
          amount: -200,
          categoryId: 'cat-food',
          category: { id: 'cat-food', name: 'Food', icon: 'Utensils' },
        }),
        makeTxn({
          id: 'tx-3',
          date: '2025-06-03',
          type: 'expense',
          amount: -1500,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        makeTxn({
          id: 'tx-4',
          date: '2025-06-04',
          type: 'expense',
          amount: -300,
          categoryId: 'cat-transport',
          category: { id: 'cat-transport', name: 'Transport', icon: 'Car' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      // expense:total → expense categories, sorted by amount desc
      const expenseLinks = result.links.filter((l) => l.source === 'expense:total');
      expect(expenseLinks).toHaveLength(3);
      // Sorted: rent(1500) > transport(300) > food(200)
      expect(expenseLinks[0]).toMatchObject({ target: 'expense:cat-rent', value: 1500 });
      expect(expenseLinks[1]).toMatchObject({ target: 'expense:cat-transport', value: 300 });
      expect(expenseLinks[2]).toMatchObject({ target: 'expense:cat-food', value: 200 });
    });

    it('handles multiple goal contributions with proportional allocation', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -2000,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        // Two goals
        makeTxn({
          id: 'tx-g1',
          date: '2025-06-10',
          type: 'income',
          amount: 600,
          categoryId: 'cat-savings',
          category: { id: 'cat-savings', name: 'Savings', icon: 'PiggyBank' },
          goalId: 'goal-vacation',
          goal: { id: 'goal-vacation', name: 'Vacation', icon: 'Plane', targetAmount: 2000, createdAt: '2025-01-01' },
        }),
        makeTxn({
          id: 'tx-g2',
          date: '2025-06-11',
          type: 'income',
          amount: 400,
          categoryId: 'cat-savings',
          category: { id: 'cat-savings', name: 'Savings', icon: 'PiggyBank' },
          goalId: 'goal-emergency',
          goal: { id: 'goal-emergency', name: 'Emergency Fund', icon: 'Shield', targetAmount: 10000, createdAt: '2025-01-01' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      // netSavings = 6000 - 2000 = 4000
      // Goal contributions = 600 + 400 = 1000 (capped at min(4000, 1000) = 1000)
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain('goal-savings:goal-vacation');
      expect(nodeIds).toContain('goal-savings:goal-emergency');

      // Both goals should have links from special:savings
      const goalLinks = result.links.filter((l) => l.source === 'special:savings' && l.target.startsWith('goal-savings:'));
      expect(goalLinks).toHaveLength(2);

      // Total allocated to goals should be 1000
      const totalGoalAllocated = goalLinks.reduce((sum, l) => sum + l.value, 0);
      expect(totalGoalAllocated).toBe(1000);
    });

    it('skips income categories with zero amount', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 0,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -500,
          categoryId: 'cat-food',
          category: { id: 'cat-food', name: 'Food', icon: 'Utensils' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      const nodeIds = result.nodes.map((n) => n.id);
      // Zero income category node should be skipped
      expect(nodeIds).not.toContain('income:cat-salary');
    });

    it('node labels reflect category names', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -500,
          categoryId: 'cat-food',
          category: { id: 'cat-food', name: 'Food', icon: 'Utensils' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      const incomeNode = result.nodes.find((n) => n.id === 'income:cat-salary');
      expect(incomeNode?.nodeLabel).toBe('Salary');

      const expenseNode = result.nodes.find((n) => n.id === 'expense:cat-food');
      expect(expenseNode?.nodeLabel).toBe('Food');

      const hubNode = result.nodes.find((n) => n.id === 'hub:gross-income');
      expect(hubNode?.nodeLabel).toBe('Gross Income');

      const expenseTotalNode = result.nodes.find((n) => n.id === 'expense:total');
      expect(expenseTotalNode?.nodeLabel).toBe('Total Expenses');
    });

    it('all nodes have a nodeColor property', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -500,
          categoryId: 'cat-food',
          category: { id: 'cat-food', name: 'Food', icon: 'Utensils' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      for (const node of result.nodes) {
        expect(node.nodeColor).toBeTruthy();
        expect(node.nodeColor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('handles transactions without transferPairId in transfers', () => {
      const txns = [
        makeTxn({
          id: 'tx-t1',
          date: '2025-06-05',
          type: 'transfer',
          amount: -500,
          categoryId: 'cat-transfer',
          category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' },
          // No transferPairId
        }),
        makeTxn({
          id: 'tx-t2',
          date: '2025-06-05',
          type: 'transfer',
          amount: 500,
          categoryId: 'cat-transfer',
          category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' },
          // No transferPairId
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      // Without transferPairId, both legs are counted
      expect(result.summary.totalTransfers).toBe(1000);
    });

    it('savings node is not created when expenses equal income', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 2000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -2000,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      expect(result.summary.netSavings).toBe(0);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).not.toContain('special:savings');
      expect(nodeIds).not.toContain('special:shortfall');
    });

    it('goal contributions without goalId are ignored', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        // Has positive amount but no goalId
        makeTxn({
          id: 'tx-2',
          date: '2025-06-10',
          type: 'income',
          amount: 500,
          categoryId: 'cat-savings',
          category: { id: 'cat-savings', name: 'Savings', icon: 'PiggyBank' },
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      const nodeIds = result.nodes.map((n) => n.id);
      const goalNodes = nodeIds.filter((id) => id.startsWith('goal-savings:'));
      expect(goalNodes).toHaveLength(0);
    });

    it('summary includes all computed values', () => {
      const txns = [
        makeTxn({
          id: 'tx-1',
          date: '2025-06-01',
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          category: { id: 'cat-salary', name: 'Salary', icon: 'Banknote' },
        }),
        makeTxn({
          id: 'tx-2',
          date: '2025-06-05',
          type: 'expense',
          amount: -1500,
          categoryId: 'cat-rent',
          category: { id: 'cat-rent', name: 'Rent', icon: 'Home' },
        }),
        makeTxn({
          id: 'tx-t1',
          date: '2025-06-06',
          type: 'transfer',
          amount: -300,
          categoryId: 'cat-transfer',
          category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' },
          transferPairId: 'pair-1',
        }),
        makeTxn({
          id: 'tx-t2',
          date: '2025-06-06',
          type: 'transfer',
          amount: 300,
          categoryId: 'cat-transfer',
          category: { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowRightLeft' },
          transferPairId: 'pair-1',
        }),
      ];
      const result = buildSankeyData(txns, 'this-month');

      expect(result.summary).toEqual({
        totalIncome: 5000,
        totalExpenses: 1500,
        totalTransfers: 300,
        netSavings: 3500,
      });
    });
  });
});
