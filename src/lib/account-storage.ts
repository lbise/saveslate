import type { Account, AccountType } from '../types';

const ACCOUNTS_KEY = 'melomoney:accounts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAccountType(value: unknown): value is AccountType {
  return value === 'checking' || value === 'savings' || value === 'credit' || value === 'cash';
}

function normalizeCurrency(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : 'CHF';
}

function normalizeIdentifier(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseAccount(value: unknown): Account | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const currency = typeof value.currency === 'string' ? normalizeCurrency(value.currency) : 'CHF';
  const icon = typeof value.icon === 'string' && value.icon.trim() ? value.icon.trim() : 'Wallet';
  const balance = typeof value.balance === 'number' && Number.isFinite(value.balance)
    ? value.balance
    : Number.NaN;

  if (!id || !name || Number.isNaN(balance) || !isAccountType(value.type)) {
    return null;
  }

  return {
    id,
    name,
    type: value.type,
    balance,
    currency,
    icon,
    accountIdentifier: typeof value.accountIdentifier === 'string'
      ? normalizeIdentifier(value.accountIdentifier)
      : undefined,
  };
}

export function createUniqueAccountId(existingIds: Set<string>): string {
  let candidate = '';
  do {
    candidate = `account-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const accounts = parsed
      .map((account) => parseAccount(account))
      .filter((account): account is Account => account !== null);

    if (accounts.length !== parsed.length) {
      saveAccounts(accounts);
    }

    return accounts;
  } catch {
    return [];
  }
}

export function getAccountById(id: string): Account | undefined {
  return loadAccounts().find((account) => account.id === id);
}

export function getTotalBalance(): number {
  return loadAccounts().reduce((sum, account) => sum + account.balance, 0);
}

export function getNetWorth(): number {
  return loadAccounts().reduce((sum, account) => sum + account.balance, 0);
}

export function addAccount(account: Account): Account {
  const accounts = loadAccounts();
  const existingIds = new Set(accounts.map((existingAccount) => existingAccount.id));
  const nextId = account.id && !existingIds.has(account.id)
    ? account.id
    : createUniqueAccountId(existingIds);

  const nextAccount: Account = {
    ...account,
    id: nextId,
    currency: normalizeCurrency(account.currency),
    icon: account.icon.trim() || 'Wallet',
    accountIdentifier: normalizeIdentifier(account.accountIdentifier),
  };

  accounts.push(nextAccount);
  saveAccounts(accounts);
  return nextAccount;
}

export function updateAccount(
  id: string,
  updates: Partial<Omit<Account, 'id'>>,
): Account | null {
  const accounts = loadAccounts();
  const accountIndex = accounts.findIndex((account) => account.id === id);
  if (accountIndex === -1) {
    return null;
  }

  const currentAccount = accounts[accountIndex];
  const nextName = typeof updates.name === 'string' && updates.name.trim()
    ? updates.name.trim()
    : currentAccount.name;
  const nextType = isAccountType(updates.type)
    ? updates.type
    : currentAccount.type;
  const nextBalance = typeof updates.balance === 'number' && Number.isFinite(updates.balance)
    ? updates.balance
    : currentAccount.balance;
  const nextCurrency = typeof updates.currency === 'string'
    ? normalizeCurrency(updates.currency)
    : currentAccount.currency;
  const nextIcon = typeof updates.icon === 'string' && updates.icon.trim()
    ? updates.icon.trim()
    : currentAccount.icon;
  const nextIdentifier = updates.accountIdentifier === undefined
    ? currentAccount.accountIdentifier
    : normalizeIdentifier(updates.accountIdentifier);

  const nextAccount: Account = {
    ...currentAccount,
    name: nextName,
    type: nextType,
    balance: nextBalance,
    currency: nextCurrency,
    icon: nextIcon,
    accountIdentifier: nextIdentifier,
  };

  accounts[accountIndex] = nextAccount;
  saveAccounts(accounts);
  return nextAccount;
}

export function deleteAccount(id: string): boolean {
  const accounts = loadAccounts();
  const filteredAccounts = accounts.filter((account) => account.id !== id);
  if (filteredAccounts.length === accounts.length) {
    return false;
  }

  saveAccounts(filteredAccounts);
  return true;
}

export function mergeAccounts(incomingAccounts: Account[]): Account[] {
  const existingAccounts = loadAccounts();
  const existingAccountIds = new Set(existingAccounts.map((account) => account.id));

  const merged = [
    ...existingAccounts,
    ...incomingAccounts.map((incomingAccount) => {
      const nextId = incomingAccount.id && !existingAccountIds.has(incomingAccount.id)
        ? incomingAccount.id
        : createUniqueAccountId(existingAccountIds);

      existingAccountIds.add(nextId);

      return {
        ...incomingAccount,
        id: nextId,
        currency: normalizeCurrency(incomingAccount.currency),
        icon: incomingAccount.icon.trim() || 'Wallet',
        accountIdentifier: normalizeIdentifier(incomingAccount.accountIdentifier),
      };
    }),
  ];

  saveAccounts(merged);
  return merged;
}
