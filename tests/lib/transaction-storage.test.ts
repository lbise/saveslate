import { describe, expect, it } from 'vitest';
import { loadTransactions, saveTransactions } from '../../src/lib/transaction-storage';
import type { Transaction } from '../../src/types';

function createTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'txn-default',
    amount: -10,
    currency: 'CHF',
    categoryId: 'transfer',
    description: 'Test transaction',
    date: '2026-01-01',
    accountId: 'account-main',
    ...overrides,
  };
}

describe('transaction storage transfer normalization', () => {
  it('normalizes transfer pair id and assigns source/destination roles by amount sign', () => {
    saveTransactions([
      createTransaction({
        id: 'txn-source',
        amount: -120,
        accountId: 'checking',
        transferPairId: ' pair-1 ',
      }),
      createTransaction({
        id: 'txn-destination',
        amount: 120,
        accountId: 'savings',
        transferPairId: 'pair-1',
      }),
    ]);

    const loadedTransactions = loadTransactions();
    const source = loadedTransactions.find((transaction) => transaction.id === 'txn-source');
    const destination = loadedTransactions.find((transaction) => transaction.id === 'txn-destination');

    expect(source).toBeDefined();
    expect(destination).toBeDefined();
    expect(source?.transferPairId).toBe('pair-1');
    expect(destination?.transferPairId).toBe('pair-1');
    expect(source?.transferPairRole).toBe('source');
    expect(destination?.transferPairRole).toBe('destination');
  });

  it('clears transfer pair metadata when one leg is removed', () => {
    saveTransactions([
      createTransaction({
        id: 'txn-source',
        amount: -120,
        transferPairId: 'pair-2',
      }),
      createTransaction({
        id: 'txn-destination',
        amount: 120,
        accountId: 'savings',
        transferPairId: 'pair-2',
      }),
    ]);

    saveTransactions([
      createTransaction({
        id: 'txn-destination',
        amount: 120,
        accountId: 'savings',
        transferPairId: 'pair-2',
        transferPairRole: 'destination',
      }),
    ]);

    const [remainingTransaction] = loadTransactions();

    expect(remainingTransaction).toBeDefined();
    expect(remainingTransaction.transferPairId).toBeUndefined();
    expect(remainingTransaction.transferPairRole).toBeUndefined();
  });

  it('removes legacy mock transactions from saved transaction storage', () => {
    localStorage.setItem(
      'saveslate:transactions',
      JSON.stringify([
        createTransaction({
          id: 't1',
        }),
        createTransaction({
          id: 't2',
          rawData: { Description: 'Imported row' },
        }),
      ]),
    );

    const loadedTransactions = loadTransactions();

    expect(loadedTransactions).toHaveLength(1);
    expect(loadedTransactions[0].id).toBe('t2');
    expect(localStorage.getItem('saveslate:transactions')).not.toBeNull();
  });

  it('normalizes duplicate and empty transaction tag IDs', () => {
    saveTransactions([
      createTransaction({
        id: 'txn-with-tags',
        tagIds: [' tax ', 'travel', 'tax', '', '  '],
      }),
    ]);

    const [storedTransaction] = loadTransactions();

    expect(storedTransaction.tagIds).toEqual(['tax', 'travel']);
  });
});
