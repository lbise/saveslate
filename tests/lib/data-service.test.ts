import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getDataService,
  setDataService,
  getAccountsData,
  getAccountByIdData,
  getTotalBalanceData,
  getNetWorthData,
  addAccountData,
  updateAccountData,
  deleteAccountData,
  mergeAccountsData,
  getCategories,
  getCategoryGroups,
  getGoalsData,
  getGoalByIdData,
  getActiveGoalsData,
  getTransactionsSortedData,
  getRecentTransactionsData,
  getTransactionsByDateRangeData,
  getTransactionsByCategoryData,
  getTransactionsByGoalData,
  getTransactionsByAccountData,
  getSplitTransactionsData,
  getPendingSplitTransactionsData,
  getTransactionsWithDetailsData,
  getMonthlyStatsData,
  getCategorySpendingData,
  getGoalProgressData,
  getPendingSplitTotalData,
  clearAllUserDataData,
  CATEGORIES,
  CATEGORY_GROUPS,
  GOALS,
  getCategoryById,
  getDefaultCategories,
  getCategoryGroupById,
  getDefaultCategoryGroups,
  getArchivedGoals,
} from '../../src/lib/data-service';
import type { DataService } from '../../src/lib/data-service';

function createMockDataService(): DataService {
  return {
    getAccounts: vi.fn(() => []),
    getAccountById: vi.fn(() => undefined),
    getTotalBalance: vi.fn(() => 0),
    getNetWorth: vi.fn(() => 0),
    addAccount: vi.fn((a) => a),
    updateAccount: vi.fn(() => null),
    deleteAccount: vi.fn(() => false),
    mergeAccounts: vi.fn(() => []),
    getComputedBalances: vi.fn(() => new Map()),
    getCategories: vi.fn(() => []),
    getCategoryById: vi.fn(() => undefined),
    getDefaultCategories: vi.fn(() => []),
    getCategoryGroups: vi.fn(() => []),
    getCategoryGroupById: vi.fn(() => undefined),
    getDefaultCategoryGroups: vi.fn(() => []),
    getGoals: vi.fn(() => []),
    getGoalById: vi.fn(() => undefined),
    getActiveGoals: vi.fn(() => []),
    getArchivedGoals: vi.fn(() => []),
    getTransactionsSorted: vi.fn(() => []),
    getRecentTransactions: vi.fn(() => []),
    getTransactionsByDateRange: vi.fn(() => []),
    getTransactionsByCategory: vi.fn(() => []),
    getTransactionsByGoal: vi.fn(() => []),
    getTransactionsByAccount: vi.fn(() => []),
    getSplitTransactions: vi.fn(() => []),
    getPendingSplitTransactions: vi.fn(() => []),
    getTransactionsWithDetails: vi.fn(() => []),
    getMonthlyStats: vi.fn(() => ({
      totalIncome: 0,
      totalExpenses: 0,
      totalTransfers: 0,
      netSavings: 0,
      savingsRate: 0,
    })),
    getCategorySpending: vi.fn(() => []),
    getGoalProgress: vi.fn(() => []),
    getPendingSplitTotal: vi.fn(() => 0),
    clearAllUserData: vi.fn(async () => {}),
  };
}

const ALL_METHOD_NAMES: (keyof DataService)[] = [
  'getAccounts',
  'getAccountById',
  'getTotalBalance',
  'getNetWorth',
  'addAccount',
  'updateAccount',
  'deleteAccount',
  'mergeAccounts',
  'getCategories',
  'getCategoryById',
  'getDefaultCategories',
  'getCategoryGroups',
  'getCategoryGroupById',
  'getDefaultCategoryGroups',
  'getGoals',
  'getGoalById',
  'getActiveGoals',
  'getArchivedGoals',
  'getTransactionsSorted',
  'getRecentTransactions',
  'getTransactionsByDateRange',
  'getTransactionsByCategory',
  'getTransactionsByGoal',
  'getTransactionsByAccount',
  'getSplitTransactions',
  'getPendingSplitTransactions',
  'getTransactionsWithDetails',
  'getMonthlyStats',
  'getCategorySpending',
  'getGoalProgress',
  'getPendingSplitTotal',
  'clearAllUserData',
];

describe('data-service', () => {
  let originalService: DataService;

  beforeEach(() => {
    originalService = getDataService();
  });

  afterEach(() => {
    setDataService(originalService);
  });

  describe('getDataService (default)', () => {
    it('returns a DataService instance', () => {
      const service = getDataService();
      expect(service).toBeDefined();
      expect(typeof service).toBe('object');
    });

    it.each(ALL_METHOD_NAMES)('default service has method "%s"', (method) => {
      const service = getDataService();
      expect(typeof service[method]).toBe('function');
    });

    it('returns the same instance on consecutive calls', () => {
      const a = getDataService();
      const b = getDataService();
      expect(a).toBe(b);
    });
  });

  describe('setDataService', () => {
    it('replaces the active service', () => {
      const mock = createMockDataService();
      setDataService(mock);
      expect(getDataService()).toBe(mock);
    });

    it('can be restored to the original service', () => {
      const mock = createMockDataService();
      setDataService(mock);
      expect(getDataService()).toBe(mock);

      setDataService(originalService);
      expect(getDataService()).toBe(originalService);
    });
  });

  describe('convenience functions delegate to active service', () => {
    let mock: DataService;

    beforeEach(() => {
      mock = createMockDataService();
      setDataService(mock);
    });

    it('getAccountsData delegates to getAccounts', () => {
      getAccountsData();
      expect(mock.getAccounts).toHaveBeenCalledOnce();
    });

    it('getAccountByIdData delegates to getAccountById', () => {
      getAccountByIdData('acc-1');
      expect(mock.getAccountById).toHaveBeenCalledWith('acc-1');
    });

    it('getTotalBalanceData delegates to getTotalBalance', () => {
      getTotalBalanceData();
      expect(mock.getTotalBalance).toHaveBeenCalledOnce();
    });

    it('getNetWorthData delegates to getNetWorth', () => {
      getNetWorthData();
      expect(mock.getNetWorth).toHaveBeenCalledOnce();
    });

    it('addAccountData delegates to addAccount', () => {
      const account = { id: 'a1' } as Parameters<DataService['addAccount']>[0];
      addAccountData(account);
      expect(mock.addAccount).toHaveBeenCalledWith(account);
    });

    it('updateAccountData delegates to updateAccount', () => {
      updateAccountData('acc-1', { name: 'New Name' });
      expect(mock.updateAccount).toHaveBeenCalledWith('acc-1', { name: 'New Name' });
    });

    it('deleteAccountData delegates to deleteAccount', () => {
      deleteAccountData('acc-1');
      expect(mock.deleteAccount).toHaveBeenCalledWith('acc-1');
    });

    it('mergeAccountsData delegates to mergeAccounts', () => {
      const accounts = [] as Parameters<DataService['mergeAccounts']>[0];
      mergeAccountsData(accounts);
      expect(mock.mergeAccounts).toHaveBeenCalledWith(accounts);
    });

    it('getCategories delegates to getCategories', () => {
      getCategories();
      expect(mock.getCategories).toHaveBeenCalledOnce();
    });

    it('getCategoryGroups delegates to getCategoryGroups', () => {
      getCategoryGroups();
      expect(mock.getCategoryGroups).toHaveBeenCalledOnce();
    });

    it('getGoalsData delegates to getGoals', () => {
      getGoalsData();
      expect(mock.getGoals).toHaveBeenCalledOnce();
    });

    it('getGoalByIdData delegates to getGoalById', () => {
      getGoalByIdData('g-1');
      expect(mock.getGoalById).toHaveBeenCalledWith('g-1');
    });

    it('getActiveGoalsData delegates to getActiveGoals', () => {
      getActiveGoalsData();
      expect(mock.getActiveGoals).toHaveBeenCalledOnce();
    });

    it('getTransactionsSortedData delegates to getTransactionsSorted', () => {
      getTransactionsSortedData();
      expect(mock.getTransactionsSorted).toHaveBeenCalledOnce();
    });

    it('getRecentTransactionsData delegates to getRecentTransactions', () => {
      getRecentTransactionsData(5);
      expect(mock.getRecentTransactions).toHaveBeenCalledWith(5);
    });

    it('getTransactionsByDateRangeData delegates to getTransactionsByDateRange', () => {
      getTransactionsByDateRangeData('2025-01-01', '2025-12-31');
      expect(mock.getTransactionsByDateRange).toHaveBeenCalledWith('2025-01-01', '2025-12-31');
    });

    it('getTransactionsByCategoryData delegates to getTransactionsByCategory', () => {
      getTransactionsByCategoryData('cat-1');
      expect(mock.getTransactionsByCategory).toHaveBeenCalledWith('cat-1');
    });

    it('getTransactionsByGoalData delegates to getTransactionsByGoal', () => {
      getTransactionsByGoalData('g-1');
      expect(mock.getTransactionsByGoal).toHaveBeenCalledWith('g-1');
    });

    it('getTransactionsByAccountData delegates to getTransactionsByAccount', () => {
      getTransactionsByAccountData('acc-1');
      expect(mock.getTransactionsByAccount).toHaveBeenCalledWith('acc-1');
    });

    it('getSplitTransactionsData delegates to getSplitTransactions', () => {
      getSplitTransactionsData();
      expect(mock.getSplitTransactions).toHaveBeenCalledOnce();
    });

    it('getPendingSplitTransactionsData delegates to getPendingSplitTransactions', () => {
      getPendingSplitTransactionsData();
      expect(mock.getPendingSplitTransactions).toHaveBeenCalledOnce();
    });

    it('getTransactionsWithDetailsData delegates to getTransactionsWithDetails', () => {
      getTransactionsWithDetailsData();
      expect(mock.getTransactionsWithDetails).toHaveBeenCalledOnce();
    });

    it('getMonthlyStatsData delegates to getMonthlyStats', () => {
      getMonthlyStatsData();
      expect(mock.getMonthlyStats).toHaveBeenCalledOnce();
    });

    it('getCategorySpendingData delegates to getCategorySpending', () => {
      getCategorySpendingData();
      expect(mock.getCategorySpending).toHaveBeenCalledOnce();
    });

    it('getGoalProgressData delegates to getGoalProgress', () => {
      getGoalProgressData();
      expect(mock.getGoalProgress).toHaveBeenCalledOnce();
    });

    it('getPendingSplitTotalData delegates to getPendingSplitTotal', () => {
      getPendingSplitTotalData();
      expect(mock.getPendingSplitTotal).toHaveBeenCalledOnce();
    });

    it('clearAllUserDataData delegates to clearAllUserData', async () => {
      await clearAllUserDataData();
      expect(mock.clearAllUserData).toHaveBeenCalledOnce();
    });
  });

  describe('re-exports', () => {
    it('CATEGORIES is a non-empty array', () => {
      expect(Array.isArray(CATEGORIES)).toBe(true);
      expect(CATEGORIES.length).toBeGreaterThan(0);
    });

    it('CATEGORY_GROUPS is a non-empty array', () => {
      expect(Array.isArray(CATEGORY_GROUPS)).toBe(true);
      expect(CATEGORY_GROUPS.length).toBeGreaterThan(0);
    });

    it('GOALS is an array', () => {
      expect(Array.isArray(GOALS)).toBe(true);
    });

    it('getCategoryById is a function', () => {
      expect(typeof getCategoryById).toBe('function');
    });

    it('getDefaultCategories is a function', () => {
      expect(typeof getDefaultCategories).toBe('function');
    });

    it('getCategoryGroupById is a function', () => {
      expect(typeof getCategoryGroupById).toBe('function');
    });

    it('getDefaultCategoryGroups is a function', () => {
      expect(typeof getDefaultCategoryGroups).toBe('function');
    });

    it('getArchivedGoals is a function', () => {
      expect(typeof getArchivedGoals).toBe('function');
    });
  });
});
