import { describe, expect, it, beforeEach, vi } from 'vitest';
import { loadTransactions } from '../../src/lib/transaction-storage';
import {
  createUniqueAccountId,
  saveAccounts,
  loadAccounts,
  getAccountById,
  getComputedBalances,
  getComputedBalance,
  getTotalBalance,
  getNetWorth,
  addAccount,
  updateAccount,
  deleteAccount,
  mergeAccounts,
} from '../../src/lib/account-storage';
import type { Account, Transaction } from '../../src/types';

vi.mock('../../src/lib/transaction-storage', () => ({
  loadTransactions: vi.fn(() => []),
}));

const STORAGE_KEY = 'saveslate:accounts';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Main Account',
    type: 'checking',
    balance: 1000,
    currency: 'CHF',
    icon: 'Wallet',
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'txn-1',
    amount: -50,
    currency: 'CHF',
    categoryId: 'groceries',
    description: 'Test transaction',
    date: '2026-01-15',
    accountId: 'acc-1',
    ...overrides,
  };
}

describe('account-storage', () => {
  beforeEach(() => {
    vi.mocked(loadTransactions).mockReturnValue([]);
  });

  // ── createUniqueAccountId ──────────────────────────────────────────

  describe('createUniqueAccountId', () => {
    it('generates an id matching account-{timestamp}-{random} format', () => {
      const id = createUniqueAccountId(new Set());
      expect(id).toMatch(/^account-\d+-[a-z0-9]+$/);
    });

    it('never returns an id already in existingIds', () => {
      const existingIds = new Set<string>();
      // Generate several ids and ensure uniqueness
      for (let i = 0; i < 50; i++) {
        const id = createUniqueAccountId(existingIds);
        expect(existingIds.has(id)).toBe(false);
        existingIds.add(id);
      }
    });

    it('retries when candidate collides with existingIds', () => {
      const realDateNow = Date.now;
      const realMathRandom = Math.random;

      // Force a collision on the first call by making Date.now and Math.random deterministic
      Date.now = vi.fn()
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1000)
        .mockReturnValue(2000);
      Math.random = vi.fn()
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.5) // same -> collision
        .mockReturnValue(0.7);

      const firstId = `account-1000-${(0.5).toString(36).slice(2, 8)}`;
      const existing = new Set([firstId]);
      const result = createUniqueAccountId(existing);

      expect(result).not.toBe(firstId);
      expect(result).toMatch(/^account-\d+-[a-z0-9]+$/);

      Date.now = realDateNow;
      Math.random = realMathRandom;
    });
  });

  // ── saveAccounts ───────────────────────────────────────────────────

  describe('saveAccounts', () => {
    it('serializes accounts to localStorage', () => {
      const accounts = [makeAccount(), makeAccount({ id: 'acc-2', name: 'Savings' })];
      saveAccounts(accounts);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe('acc-1');
      expect(stored[1].id).toBe('acc-2');
    });

    it('saves an empty array', () => {
      saveAccounts([]);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toEqual([]);
    });
  });

  // ── loadAccounts ───────────────────────────────────────────────────

  describe('loadAccounts', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(loadAccounts()).toEqual([]);
    });

    it('loads valid accounts from localStorage', () => {
      const accounts = [makeAccount(), makeAccount({ id: 'acc-2', name: 'Savings', type: 'savings' })];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

      const result = loadAccounts();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('acc-1');
      expect(result[1].type).toBe('savings');
    });

    it('returns empty array for invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not json at all{{{');
      expect(loadAccounts()).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'acc-1' }));
      expect(loadAccounts()).toEqual([]);
    });

    it('filters out entries with missing id', () => {
      const raw = [makeAccount(), { name: 'No ID', type: 'checking', balance: 0, currency: 'CHF', icon: 'Wallet' }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('acc-1');
    });

    it('filters out entries with empty name', () => {
      const raw = [makeAccount(), makeAccount({ id: 'acc-2', name: '' })];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result).toHaveLength(1);
    });

    it('filters out entries with invalid account type', () => {
      const raw = [makeAccount(), { id: 'acc-2', name: 'Bad', type: 'bitcoin', balance: 0, currency: 'CHF', icon: 'Wallet' }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result).toHaveLength(1);
    });

    it('filters out entries with non-finite balance', () => {
      const raw = [
        makeAccount(),
        makeAccount({ id: 'acc-nan', balance: NaN as number }),
        makeAccount({ id: 'acc-inf', balance: Infinity as number }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('acc-1');
    });

    it('filters out non-object entries', () => {
      const raw = [makeAccount(), 'not an object', 42, null, true];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result).toHaveLength(1);
    });

    it('defaults currency to CHF when missing', () => {
      const raw = [{ id: 'acc-1', name: 'Test', type: 'checking', balance: 0 }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result[0].currency).toBe('CHF');
    });

    it('uppercases currency from stored data', () => {
      const raw = [makeAccount({ currency: '  eur  ' })];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result[0].currency).toBe('EUR');
    });

    it('defaults icon to Wallet when missing or empty', () => {
      const raw = [
        makeAccount({ icon: '' }),
        makeAccount({ id: 'acc-2', icon: '   ' }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result[0].icon).toBe('Wallet');
      expect(result[1].icon).toBe('Wallet');
    });

    it('trims accountIdentifier and sets undefined if empty', () => {
      const raw = [
        makeAccount({ accountIdentifier: '  CH12 3456  ' }),
        makeAccount({ id: 'acc-2', accountIdentifier: '   ' }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      const result = loadAccounts();
      expect(result[0].accountIdentifier).toBe('CH12 3456');
      expect(result[1].accountIdentifier).toBeUndefined();
    });

    it('re-saves when some items are filtered out', () => {
      const raw = [makeAccount(), { invalid: true }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

      loadAccounts();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('acc-1');
    });

    it('does not re-save when all items are valid', () => {
      const accounts = [makeAccount()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

      const spy = vi.spyOn(Storage.prototype, 'setItem');
      loadAccounts();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ── getAccountById ─────────────────────────────────────────────────

  describe('getAccountById', () => {
    it('returns the account when found', () => {
      saveAccounts([makeAccount(), makeAccount({ id: 'acc-2', name: 'Savings' })]);

      const result = getAccountById('acc-2');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Savings');
    });

    it('returns undefined when not found', () => {
      saveAccounts([makeAccount()]);
      expect(getAccountById('nonexistent')).toBeUndefined();
    });

    it('returns undefined when storage is empty', () => {
      expect(getAccountById('acc-1')).toBeUndefined();
    });
  });

  // ── getComputedBalances ────────────────────────────────────────────

  describe('getComputedBalances', () => {
    it('returns base balances when there are no transactions', () => {
      saveAccounts([
        makeAccount({ id: 'acc-1', balance: 1000 }),
        makeAccount({ id: 'acc-2', balance: 500 }),
      ]);

      const balances = getComputedBalances();
      expect(balances.get('acc-1')).toBe(1000);
      expect(balances.get('acc-2')).toBe(500);
    });

    it('adds transaction amounts to the corresponding account balances', () => {
      saveAccounts([
        makeAccount({ id: 'acc-1', balance: 1000 }),
        makeAccount({ id: 'acc-2', balance: 500 }),
      ]);

      vi.mocked(loadTransactions).mockReturnValue([
        makeTransaction({ accountId: 'acc-1', amount: -200 }),
        makeTransaction({ id: 'txn-2', accountId: 'acc-1', amount: 50 }),
        makeTransaction({ id: 'txn-3', accountId: 'acc-2', amount: -100 }),
      ]);

      const balances = getComputedBalances();
      expect(balances.get('acc-1')).toBe(850); // 1000 - 200 + 50
      expect(balances.get('acc-2')).toBe(400); // 500 - 100
    });

    it('ignores transactions for unknown account ids', () => {
      saveAccounts([makeAccount({ id: 'acc-1', balance: 1000 })]);

      vi.mocked(loadTransactions).mockReturnValue([
        makeTransaction({ accountId: 'unknown-account', amount: -999 }),
      ]);

      const balances = getComputedBalances();
      expect(balances.get('acc-1')).toBe(1000);
      expect(balances.has('unknown-account')).toBe(false);
    });

    it('returns empty map when no accounts exist', () => {
      const balances = getComputedBalances();
      expect(balances.size).toBe(0);
    });
  });

  // ── getComputedBalance ─────────────────────────────────────────────

  describe('getComputedBalance', () => {
    it('returns computed balance for an existing account', () => {
      saveAccounts([makeAccount({ id: 'acc-1', balance: 1000 })]);

      vi.mocked(loadTransactions).mockReturnValue([
        makeTransaction({ accountId: 'acc-1', amount: -300 }),
        makeTransaction({ id: 'txn-2', accountId: 'acc-1', amount: 100 }),
      ]);

      expect(getComputedBalance('acc-1')).toBe(800); // 1000 - 300 + 100
    });

    it('returns 0 for a non-existent account', () => {
      saveAccounts([makeAccount()]);
      expect(getComputedBalance('nonexistent')).toBe(0);
    });

    it('ignores transactions for other accounts', () => {
      saveAccounts([
        makeAccount({ id: 'acc-1', balance: 1000 }),
        makeAccount({ id: 'acc-2', balance: 500 }),
      ]);

      vi.mocked(loadTransactions).mockReturnValue([
        makeTransaction({ accountId: 'acc-2', amount: -200 }),
      ]);

      expect(getComputedBalance('acc-1')).toBe(1000);
    });
  });

  // ── getTotalBalance ────────────────────────────────────────────────

  describe('getTotalBalance', () => {
    it('sums computed balances across all accounts', () => {
      saveAccounts([
        makeAccount({ id: 'acc-1', balance: 1000 }),
        makeAccount({ id: 'acc-2', balance: 2000 }),
      ]);

      vi.mocked(loadTransactions).mockReturnValue([
        makeTransaction({ accountId: 'acc-1', amount: -100 }),
        makeTransaction({ id: 'txn-2', accountId: 'acc-2', amount: 300 }),
      ]);

      expect(getTotalBalance()).toBe(3200); // (1000-100) + (2000+300)
    });

    it('returns 0 when there are no accounts', () => {
      expect(getTotalBalance()).toBe(0);
    });
  });

  // ── getNetWorth ────────────────────────────────────────────────────

  describe('getNetWorth', () => {
    it('returns the same value as getTotalBalance', () => {
      saveAccounts([
        makeAccount({ id: 'acc-1', balance: 1500 }),
        makeAccount({ id: 'acc-2', balance: 3000 }),
      ]);

      vi.mocked(loadTransactions).mockReturnValue([
        makeTransaction({ accountId: 'acc-1', amount: -500 }),
      ]);

      expect(getNetWorth()).toBe(getTotalBalance());
    });

    it('returns 0 when no accounts exist', () => {
      expect(getNetWorth()).toBe(0);
    });
  });

  // ── addAccount ─────────────────────────────────────────────────────

  describe('addAccount', () => {
    it('adds an account with its original id when unique', () => {
      const result = addAccount(makeAccount({ id: 'my-custom-id' }));

      expect(result.id).toBe('my-custom-id');
      const stored = loadAccounts();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('my-custom-id');
    });

    it('generates a new id when the provided id collides', () => {
      saveAccounts([makeAccount({ id: 'acc-1' })]);

      const result = addAccount(makeAccount({ id: 'acc-1', name: 'Duplicate' }));

      expect(result.id).not.toBe('acc-1');
      expect(result.id).toMatch(/^account-\d+-[a-z0-9]+$/);
      expect(result.name).toBe('Duplicate');

      const stored = loadAccounts();
      expect(stored).toHaveLength(2);
    });

    it('normalizes currency to uppercase', () => {
      const result = addAccount(makeAccount({ currency: '  eur  ' }));
      expect(result.currency).toBe('EUR');
    });

    it('defaults currency to CHF when empty', () => {
      const result = addAccount(makeAccount({ currency: '   ' }));
      expect(result.currency).toBe('CHF');
    });

    it('defaults icon to Wallet when empty', () => {
      const result = addAccount(makeAccount({ icon: '   ' }));
      expect(result.icon).toBe('Wallet');
    });

    it('trims icon name', () => {
      const result = addAccount(makeAccount({ icon: '  CreditCard  ' }));
      expect(result.icon).toBe('CreditCard');
    });

    it('normalizes accountIdentifier', () => {
      const result = addAccount(makeAccount({ accountIdentifier: '  CH12 3456  ' }));
      expect(result.accountIdentifier).toBe('CH12 3456');
    });

    it('sets accountIdentifier to undefined when empty', () => {
      const result = addAccount(makeAccount({ accountIdentifier: '   ' }));
      expect(result.accountIdentifier).toBeUndefined();
    });

    it('generates new id when provided id is empty string', () => {
      const result = addAccount(makeAccount({ id: '' }));
      expect(result.id).toMatch(/^account-\d+-[a-z0-9]+$/);
    });
  });

  // ── updateAccount ──────────────────────────────────────────────────

  describe('updateAccount', () => {
    it('updates all fields of an existing account', () => {
      saveAccounts([makeAccount()]);

      const result = updateAccount('acc-1', {
        name: 'Updated',
        type: 'savings',
        balance: 2000,
        currency: 'usd',
        icon: 'Landmark',
        accountIdentifier: 'US-12345',
      });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated');
      expect(result!.type).toBe('savings');
      expect(result!.balance).toBe(2000);
      expect(result!.currency).toBe('USD');
      expect(result!.icon).toBe('Landmark');
      expect(result!.accountIdentifier).toBe('US-12345');
    });

    it('returns null when account id is not found', () => {
      saveAccounts([makeAccount()]);
      expect(updateAccount('nonexistent', { name: 'Test' })).toBeNull();
    });

    it('keeps current name when update name is empty', () => {
      saveAccounts([makeAccount({ name: 'Original' })]);
      const result = updateAccount('acc-1', { name: '   ' });
      expect(result!.name).toBe('Original');
    });

    it('keeps current name when update name is not a string', () => {
      saveAccounts([makeAccount({ name: 'Original' })]);
      const result = updateAccount('acc-1', { name: 123 as unknown as string });
      expect(result!.name).toBe('Original');
    });

    it('keeps current type when update type is invalid', () => {
      saveAccounts([makeAccount({ type: 'checking' })]);
      const result = updateAccount('acc-1', { type: 'bitcoin' as Account['type'] });
      expect(result!.type).toBe('checking');
    });

    it('keeps current balance when update balance is non-finite', () => {
      saveAccounts([makeAccount({ balance: 500 })]);
      const result = updateAccount('acc-1', { balance: NaN });
      expect(result!.balance).toBe(500);
    });

    it('keeps current balance when update balance is Infinity', () => {
      saveAccounts([makeAccount({ balance: 500 })]);
      const result = updateAccount('acc-1', { balance: Infinity });
      expect(result!.balance).toBe(500);
    });

    it('normalizes updated currency to uppercase', () => {
      saveAccounts([makeAccount()]);
      const result = updateAccount('acc-1', { currency: '  gbp  ' });
      expect(result!.currency).toBe('GBP');
    });

    it('keeps current icon when update icon is empty', () => {
      saveAccounts([makeAccount({ icon: 'Landmark' })]);
      const result = updateAccount('acc-1', { icon: '   ' });
      expect(result!.icon).toBe('Landmark');
    });

    it('normalizes accountIdentifier on update', () => {
      saveAccounts([makeAccount()]);
      const result = updateAccount('acc-1', { accountIdentifier: '  IBAN-123  ' });
      expect(result!.accountIdentifier).toBe('IBAN-123');
    });

    it('clears accountIdentifier when set to empty string', () => {
      saveAccounts([makeAccount({ accountIdentifier: 'IBAN-123' })]);
      const result = updateAccount('acc-1', { accountIdentifier: '   ' });
      expect(result!.accountIdentifier).toBeUndefined();
    });

    it('keeps current accountIdentifier when not in updates', () => {
      saveAccounts([makeAccount({ accountIdentifier: 'IBAN-123' })]);
      const result = updateAccount('acc-1', { name: 'Renamed' });
      expect(result!.accountIdentifier).toBe('IBAN-123');
    });

    it('performs a partial update, leaving other fields unchanged', () => {
      saveAccounts([makeAccount({ name: 'Original', balance: 1000, type: 'checking' })]);
      const result = updateAccount('acc-1', { balance: 2000 });

      expect(result!.name).toBe('Original');
      expect(result!.type).toBe('checking');
      expect(result!.balance).toBe(2000);
    });

    it('persists changes to localStorage', () => {
      saveAccounts([makeAccount()]);
      updateAccount('acc-1', { name: 'Persisted' });

      const stored = loadAccounts();
      expect(stored[0].name).toBe('Persisted');
    });
  });

  // ── deleteAccount ──────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('deletes an existing account and returns true', () => {
      saveAccounts([makeAccount(), makeAccount({ id: 'acc-2' })]);

      const result = deleteAccount('acc-1');
      expect(result).toBe(true);

      const stored = loadAccounts();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('acc-2');
    });

    it('returns false when account does not exist', () => {
      saveAccounts([makeAccount()]);
      expect(deleteAccount('nonexistent')).toBe(false);
    });

    it('returns false when storage is empty', () => {
      expect(deleteAccount('acc-1')).toBe(false);
    });
  });

  // ── mergeAccounts ──────────────────────────────────────────────────

  describe('mergeAccounts', () => {
    it('appends incoming accounts when there are no id collisions', () => {
      saveAccounts([makeAccount({ id: 'acc-1' })]);

      const result = mergeAccounts([
        makeAccount({ id: 'acc-new', name: 'New Account' }),
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('acc-1');
      expect(result[1].id).toBe('acc-new');
      expect(result[1].name).toBe('New Account');
    });

    it('generates new ids for incoming accounts that collide with existing', () => {
      saveAccounts([makeAccount({ id: 'acc-1' })]);

      const result = mergeAccounts([
        makeAccount({ id: 'acc-1', name: 'Colliding' }),
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('acc-1');
      expect(result[1].id).not.toBe('acc-1');
      expect(result[1].id).toMatch(/^account-\d+-[a-z0-9]+$/);
      expect(result[1].name).toBe('Colliding');
    });

    it('generates unique ids when multiple incoming accounts collide with each other', () => {
      const result = mergeAccounts([
        makeAccount({ id: 'acc-dup', name: 'First' }),
        makeAccount({ id: 'acc-dup', name: 'Second' }),
      ]);

      expect(result).toHaveLength(2);
      // First gets its original id, second must get a new one
      expect(result[0].id).toBe('acc-dup');
      expect(result[1].id).not.toBe('acc-dup');
    });

    it('normalizes currency on incoming accounts', () => {
      const result = mergeAccounts([
        makeAccount({ id: 'acc-new', currency: '  usd  ' }),
      ]);

      expect(result[0].currency).toBe('USD');
    });

    it('defaults icon to Wallet on incoming accounts with empty icon', () => {
      const result = mergeAccounts([
        makeAccount({ id: 'acc-new', icon: '   ' }),
      ]);

      expect(result[0].icon).toBe('Wallet');
    });

    it('normalizes accountIdentifier on incoming accounts', () => {
      const result = mergeAccounts([
        makeAccount({ id: 'acc-new', accountIdentifier: '  IBAN  ' }),
      ]);

      expect(result[0].accountIdentifier).toBe('IBAN');
    });

    it('sets accountIdentifier to undefined when incoming value is empty', () => {
      const result = mergeAccounts([
        makeAccount({ id: 'acc-new', accountIdentifier: '   ' }),
      ]);

      expect(result[0].accountIdentifier).toBeUndefined();
    });

    it('persists merged accounts to localStorage', () => {
      saveAccounts([makeAccount({ id: 'acc-1' })]);
      mergeAccounts([makeAccount({ id: 'acc-2', name: 'Merged' })]);

      const stored = loadAccounts();
      expect(stored).toHaveLength(2);
    });

    it('preserves existing accounts unchanged', () => {
      saveAccounts([makeAccount({ id: 'acc-1', name: 'Original', balance: 999 })]);
      const result = mergeAccounts([makeAccount({ id: 'acc-2' })]);

      expect(result[0].name).toBe('Original');
      expect(result[0].balance).toBe(999);
    });

    it('handles merging into empty storage', () => {
      const result = mergeAccounts([
        makeAccount({ id: 'acc-a' }),
        makeAccount({ id: 'acc-b' }),
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('acc-a');
      expect(result[1].id).toBe('acc-b');
    });
  });

  // ── parseAccount validation (via loadAccounts) ─────────────────────

  describe('parseAccount validation (indirect via loadAccounts)', () => {
    it('rejects entry with non-string id', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        { id: 123, name: 'Test', type: 'checking', balance: 0, currency: 'CHF', icon: 'Wallet' },
      ]));
      expect(loadAccounts()).toEqual([]);
    });

    it('rejects entry with whitespace-only id', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        { id: '   ', name: 'Test', type: 'checking', balance: 0, currency: 'CHF', icon: 'Wallet' },
      ]));
      expect(loadAccounts()).toEqual([]);
    });

    it('rejects entry with non-string name', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        { id: 'acc-1', name: 42, type: 'checking', balance: 0, currency: 'CHF', icon: 'Wallet' },
      ]));
      expect(loadAccounts()).toEqual([]);
    });

    it('rejects entry with non-number balance', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        { id: 'acc-1', name: 'Test', type: 'checking', balance: 'one thousand', currency: 'CHF', icon: 'Wallet' },
      ]));
      expect(loadAccounts()).toEqual([]);
    });

    it('accepts all valid account types', () => {
      const types = ['checking', 'savings', 'credit', 'cash', 'investment', 'retirement'];
      const accounts = types.map((type, i) => ({
        id: `acc-${i}`,
        name: `Account ${i}`,
        type,
        balance: 0,
        currency: 'CHF',
        icon: 'Wallet',
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

      const result = loadAccounts();
      expect(result).toHaveLength(6);
    });

    it('trims id and name from stored data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        { id: '  acc-1  ', name: '  Trimmed Name  ', type: 'checking', balance: 0, currency: 'CHF', icon: 'Wallet' },
      ]));

      const result = loadAccounts();
      expect(result[0].id).toBe('acc-1');
      expect(result[0].name).toBe('Trimmed Name');
    });
  });
});
