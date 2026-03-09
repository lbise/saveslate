import {
  addAccount,
  deleteAccount,
  getAccountById,
  getAccounts,
  getNetWorth,
  getTotalBalance,
  mergeAccounts,
  updateAccount,
} from '../data/mock/accounts';
import { getComputedBalances } from './account-storage';
import { CATEGORIES, getCategoryById, getDefaultCategories } from '../data/mock/categories';
import {
  CATEGORY_GROUPS,
  getCategoryGroupById,
  getDefaultCategoryGroups,
} from '../data/mock/category-groups';
import { getActiveGoals, getArchivedGoals, getGoalById, getGoals, GOALS } from '../data/mock/goals';
import {
  getPendingSplitTransactions,
  getRecentTransactions,
  getSplitTransactions,
  getTransactionsByAccount,
  getTransactionsByCategory,
  getTransactionsByDateRange,
  getTransactionsByGoal,
  getTransactionsSorted,
} from '../data/mock/transactions';
import {
  getCategorySpending,
  getGoalProgress,
  getMonthlyStats,
  getPendingSplitTotal,
  getTransactionsWithDetails,
} from '../data/mock';
import { clearAllStoredUserData } from './user-data';
import type {
  Account,
  Category,
  CategoryGroup,
  CategorySpending,
  Goal,
  GoalProgress,
  MonthlyStats,
  Transaction,
  TransactionWithDetails,
} from '../types';

export interface DataService {
  getAccounts(): Account[];
  getAccountById(id: string): Account | undefined;
  getTotalBalance(): number;
  getNetWorth(): number;
  addAccount(account: Account): Account;
  updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>): Account | null;
  deleteAccount(id: string): boolean;
  mergeAccounts(accounts: Account[]): Account[];
  getComputedBalances(): Map<string, number>;

  getCategories(): Category[];
  getCategoryById(id: string): Category | undefined;
  getDefaultCategories(): Category[];
  getCategoryGroups(): CategoryGroup[];
  getCategoryGroupById(id: string): CategoryGroup | undefined;
  getDefaultCategoryGroups(): CategoryGroup[];

  getGoals(): Goal[];
  getGoalById(id: string): Goal | undefined;
  getActiveGoals(): Goal[];
  getArchivedGoals(): Goal[];

  getTransactionsSorted(): Transaction[];
  getRecentTransactions(count?: number): Transaction[];
  getTransactionsByDateRange(startDate: string, endDate: string): Transaction[];
  getTransactionsByCategory(categoryId: string): Transaction[];
  getTransactionsByGoal(goalId: string): Transaction[];
  getTransactionsByAccount(accountId: string): Transaction[];
  getSplitTransactions(): Transaction[];
  getPendingSplitTransactions(): Transaction[];
  getTransactionsWithDetails(): TransactionWithDetails[];

  getMonthlyStats(): MonthlyStats;
  getCategorySpending(): CategorySpending[];
  getGoalProgress(): GoalProgress[];
  getPendingSplitTotal(): number;
  clearAllUserData(): Promise<void>;
}

class LocalDataService implements DataService {
  public getAccounts(): Account[] {
    return getAccounts();
  }

  public getAccountById(id: string): Account | undefined {
    return getAccountById(id);
  }

  public getTotalBalance(): number {
    return getTotalBalance();
  }

  public getNetWorth(): number {
    return getNetWorth();
  }

  public addAccount(account: Account): Account {
    return addAccount(account);
  }

  public updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>): Account | null {
    return updateAccount(id, updates);
  }

  public deleteAccount(id: string): boolean {
    return deleteAccount(id);
  }

  public mergeAccounts(accounts: Account[]): Account[] {
    return mergeAccounts(accounts);
  }

  public getComputedBalances(): Map<string, number> {
    return getComputedBalances();
  }

  public getCategories(): Category[] {
    return CATEGORIES;
  }

  public getCategoryById(id: string): Category | undefined {
    return getCategoryById(id);
  }

  public getDefaultCategories(): Category[] {
    return getDefaultCategories();
  }

  public getCategoryGroups(): CategoryGroup[] {
    return CATEGORY_GROUPS;
  }

  public getCategoryGroupById(id: string): CategoryGroup | undefined {
    return getCategoryGroupById(id);
  }

  public getDefaultCategoryGroups(): CategoryGroup[] {
    return getDefaultCategoryGroups();
  }

  public getGoals(): Goal[] {
    return getGoals();
  }

  public getGoalById(id: string): Goal | undefined {
    return getGoalById(id);
  }

  public getActiveGoals(): Goal[] {
    return getActiveGoals();
  }

  public getArchivedGoals(): Goal[] {
    return getArchivedGoals();
  }

  public getTransactionsSorted(): Transaction[] {
    return getTransactionsSorted();
  }

  public getRecentTransactions(count?: number): Transaction[] {
    return getRecentTransactions(count);
  }

  public getTransactionsByDateRange(startDate: string, endDate: string): Transaction[] {
    return getTransactionsByDateRange(startDate, endDate);
  }

  public getTransactionsByCategory(categoryId: string): Transaction[] {
    return getTransactionsByCategory(categoryId);
  }

  public getTransactionsByGoal(goalId: string): Transaction[] {
    return getTransactionsByGoal(goalId);
  }

  public getTransactionsByAccount(accountId: string): Transaction[] {
    return getTransactionsByAccount(accountId);
  }

  public getSplitTransactions(): Transaction[] {
    return getSplitTransactions();
  }

  public getPendingSplitTransactions(): Transaction[] {
    return getPendingSplitTransactions();
  }

  public getTransactionsWithDetails(): TransactionWithDetails[] {
    return getTransactionsWithDetails();
  }

  public getMonthlyStats(): MonthlyStats {
    return getMonthlyStats();
  }

  public getCategorySpending(): CategorySpending[] {
    return getCategorySpending();
  }

  public getGoalProgress(): GoalProgress[] {
    return getGoalProgress();
  }

  public getPendingSplitTotal(): number {
    return getPendingSplitTotal();
  }

  public async clearAllUserData(): Promise<void> {
    clearAllStoredUserData();
  }
}

let activeDataService: DataService = new LocalDataService();

export function getDataService(): DataService {
  return activeDataService;
}

export function setDataService(service: DataService): void {
  activeDataService = service;
}

export const DATA_SERVICE = {
  getDataService,
  setDataService,
};

export const getAccountsData = (): Account[] => getDataService().getAccounts();
export const getAccountByIdData = (id: string): Account | undefined => getDataService().getAccountById(id);
export const getTotalBalanceData = (): number => getDataService().getTotalBalance();
export const getNetWorthData = (): number => getDataService().getNetWorth();
export const addAccountData = (account: Account): Account => getDataService().addAccount(account);
export const updateAccountData = (
  id: string,
  updates: Partial<Omit<Account, 'id'>>,
): Account | null => getDataService().updateAccount(id, updates);
export const deleteAccountData = (id: string): boolean => getDataService().deleteAccount(id);
export const mergeAccountsData = (accounts: Account[]): Account[] => getDataService().mergeAccounts(accounts);
export const getComputedBalancesData = (): Map<string, number> => getDataService().getComputedBalances();

export const getCategories = (): Category[] => getDataService().getCategories();
export const getCategoryGroups = (): CategoryGroup[] => getDataService().getCategoryGroups();
export const getGoalsData = (): Goal[] => getDataService().getGoals();
export const getGoalByIdData = (id: string): Goal | undefined => getDataService().getGoalById(id);
export const getActiveGoalsData = (): Goal[] => getDataService().getActiveGoals();

export const getTransactionsSortedData = (): Transaction[] => getDataService().getTransactionsSorted();
export const getRecentTransactionsData = (count?: number): Transaction[] => getDataService().getRecentTransactions(count);
export const getTransactionsByDateRangeData = (
  startDate: string,
  endDate: string,
): Transaction[] => getDataService().getTransactionsByDateRange(startDate, endDate);
export const getTransactionsByCategoryData = (categoryId: string): Transaction[] => getDataService().getTransactionsByCategory(categoryId);
export const getTransactionsByGoalData = (goalId: string): Transaction[] => getDataService().getTransactionsByGoal(goalId);
export const getTransactionsByAccountData = (accountId: string): Transaction[] => getDataService().getTransactionsByAccount(accountId);
export const getSplitTransactionsData = (): Transaction[] => getDataService().getSplitTransactions();
export const getPendingSplitTransactionsData = (): Transaction[] => getDataService().getPendingSplitTransactions();
export const getTransactionsWithDetailsData = (): TransactionWithDetails[] => getDataService().getTransactionsWithDetails();

export const getMonthlyStatsData = (): MonthlyStats => getDataService().getMonthlyStats();
export const getCategorySpendingData = (): CategorySpending[] => getDataService().getCategorySpending();
export const getGoalProgressData = (): GoalProgress[] => getDataService().getGoalProgress();
export const getPendingSplitTotalData = (): number => getDataService().getPendingSplitTotal();
export const clearAllUserDataData = (): Promise<void> => getDataService().clearAllUserData();

export {
  CATEGORIES,
  CATEGORY_GROUPS,
  GOALS,
  getCategoryById,
  getDefaultCategories,
  getCategoryGroupById,
  getDefaultCategoryGroups,
  getGoalsData as getGoals,
  getGoalByIdData as getGoalById,
  getActiveGoalsData as getActiveGoals,
  getArchivedGoals,
  getAccountsData as getAccounts,
  getAccountByIdData as getAccountById,
  getTotalBalanceData as getTotalBalance,
  getNetWorthData as getNetWorth,
  addAccountData as addAccount,
  updateAccountData as updateAccount,
  deleteAccountData as deleteAccount,
  mergeAccountsData as mergeAccounts,
  getComputedBalancesData as getComputedBalances,
  getTransactionsSortedData as getTransactionsSorted,
  getRecentTransactionsData as getRecentTransactions,
  getTransactionsByDateRangeData as getTransactionsByDateRange,
  getTransactionsByCategoryData as getTransactionsByCategory,
  getTransactionsByGoalData as getTransactionsByGoal,
  getTransactionsByAccountData as getTransactionsByAccount,
  getSplitTransactionsData as getSplitTransactions,
  getPendingSplitTransactionsData as getPendingSplitTransactions,
  getTransactionsWithDetailsData as getTransactionsWithDetails,
  getMonthlyStatsData as getMonthlyStats,
  getCategorySpendingData as getCategorySpending,
  getGoalProgressData as getGoalProgress,
  getPendingSplitTotalData as getPendingSplitTotal,
  clearAllUserDataData as clearAllUserData,
};
