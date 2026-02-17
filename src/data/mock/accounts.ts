import {
  addAccount as addStoredAccount,
  deleteAccount as deleteStoredAccount,
  getAccountById as getStoredAccountById,
  getNetWorth as getStoredNetWorth,
  getTotalBalance as getStoredTotalBalance,
  loadAccounts,
  mergeAccounts as mergeStoredAccounts,
  updateAccount as updateStoredAccount,
} from '../../lib/account-storage';
import type { Account } from '../../types';

export const getAccounts = (): Account[] => {
  return loadAccounts();
};

export const getAccountById = (id: string): Account | undefined => {
  return getStoredAccountById(id);
};

export const getTotalBalance = (): number => {
  return getStoredTotalBalance();
};

export const getNetWorth = (): number => {
  return getStoredNetWorth();
};

export const addAccount = (account: Account): Account => {
  return addStoredAccount(account);
};

export const updateAccount = (
  id: string,
  updates: Partial<Omit<Account, 'id'>>,
): Account | null => {
  return updateStoredAccount(id, updates);
};

export const deleteAccount = (id: string): boolean => {
  return deleteStoredAccount(id);
};

export const mergeAccounts = (incomingAccounts: Account[]): Account[] => {
  return mergeStoredAccounts(incomingAccounts);
};
