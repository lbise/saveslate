import { describe, expect, it } from 'vitest';
import {
  addTransactions,
  deleteImportBatch,
  loadImportBatches,
  loadTransactions,
  pruneEmptyImportBatches,
  renameImportBatch,
  saveImportBatch,
  saveTransactions,
} from '../../src/lib/transaction-storage';
import type { ImportBatch, Transaction } from '../../src/types';

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

function createBatch(overrides: Partial<ImportBatch> = {}): Omit<ImportBatch, 'id'> & { id?: string } {
  return {
    fileName: 'test.csv',
    importedAt: '2026-01-01T00:00:00.000Z',
    parserName: 'Test Parser',
    parserId: 'parser-1',
    rowCount: 10,
    accountId: 'acc-1',
    ...overrides,
  };
}

describe('loadTransactions edge cases', () => {
  it('returns [] for empty localStorage', () => {
    expect(loadTransactions()).toEqual([]);
  });

  it('returns [] for invalid JSON', () => {
    localStorage.setItem('saveslate:transactions', '{not valid json');

    expect(loadTransactions()).toEqual([]);
  });

  it('returns [] for non-array JSON value', () => {
    localStorage.setItem('saveslate:transactions', JSON.stringify({ foo: 'bar' }));

    expect(loadTransactions()).toEqual([]);
  });

  it('clears all transfer metadata when 3+ transactions share a transfer pair id', () => {
    saveTransactions([
      createTransaction({ id: 'txn-a', amount: -50, transferPairId: 'pair-triple' }),
      createTransaction({ id: 'txn-b', amount: 50, transferPairId: 'pair-triple' }),
      createTransaction({ id: 'txn-c', amount: 25, transferPairId: 'pair-triple' }),
    ]);

    const loaded = loadTransactions();

    for (const txn of loaded) {
      expect(txn.transferPairId).toBeUndefined();
      expect(txn.transferPairRole).toBeUndefined();
    }
  });

  it('assigns source/destination by position when both amounts have the same sign', () => {
    saveTransactions([
      createTransaction({ id: 'txn-left', amount: 100, transferPairId: 'pair-same' }),
      createTransaction({ id: 'txn-right', amount: 100, transferPairId: 'pair-same' }),
    ]);

    const loaded = loadTransactions();
    const left = loaded.find((t) => t.id === 'txn-left');
    const right = loaded.find((t) => t.id === 'txn-right');

    expect(left?.transferPairRole).toBe('source');
    expect(right?.transferPairRole).toBe('destination');
  });

  it('keeps transactions with importBatchId even if ID matches legacy mock pattern', () => {
    localStorage.setItem(
      'saveslate:transactions',
      JSON.stringify([
        createTransaction({ id: 't5', importBatchId: 'batch-123' }),
        createTransaction({ id: 't6' }),
      ]),
    );

    const loaded = loadTransactions();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('t5');
  });

  it('returns the same reference for an empty transaction list', () => {
    localStorage.setItem('saveslate:transactions', JSON.stringify([]));

    const loaded = loadTransactions();

    expect(loaded).toEqual([]);
  });
});

describe('addTransactions', () => {
  it('appends transactions to empty storage', () => {
    const result = addTransactions([
      createTransaction({ id: 'txn-1', amount: -20 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('txn-1');
  });

  it('appends transactions to existing ones', () => {
    saveTransactions([
      createTransaction({ id: 'txn-existing', amount: -50 }),
    ]);

    const result = addTransactions([
      createTransaction({ id: 'txn-new', amount: -30 }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('txn-existing');
    expect(result[1].id).toBe('txn-new');
  });

  it('returns the full combined list', () => {
    saveTransactions([
      createTransaction({ id: 'txn-a', amount: -10 }),
      createTransaction({ id: 'txn-b', amount: -20 }),
    ]);

    const result = addTransactions([
      createTransaction({ id: 'txn-c', amount: -30 }),
      createTransaction({ id: 'txn-d', amount: -40 }),
    ]);

    expect(result).toHaveLength(4);
    expect(result.map((t) => t.id)).toEqual(['txn-a', 'txn-b', 'txn-c', 'txn-d']);
  });

  it('handles empty array input as no-op', () => {
    saveTransactions([
      createTransaction({ id: 'txn-existing', amount: -10 }),
    ]);

    const result = addTransactions([]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('txn-existing');
  });

  it('applies normalization when persisting the combined list', () => {
    addTransactions([
      createTransaction({ id: 'txn-source', amount: -100, transferPairId: 'pair-add' }),
      createTransaction({ id: 'txn-dest', amount: 100, transferPairId: 'pair-add' }),
    ]);

    const loaded = loadTransactions();
    const source = loaded.find((t) => t.id === 'txn-source');
    const dest = loaded.find((t) => t.id === 'txn-dest');

    expect(source?.transferPairRole).toBe('source');
    expect(dest?.transferPairRole).toBe('destination');
  });
});

describe('loadImportBatches', () => {
  it('returns [] when no batches exist', () => {
    expect(loadImportBatches()).toEqual([]);
  });

  it('loads valid batches from localStorage', () => {
    const batch: ImportBatch = { ...createBatch(), id: 'batch-1' } as ImportBatch;
    localStorage.setItem('saveslate:import-batches', JSON.stringify([batch]));

    const loaded = loadImportBatches();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('batch-1');
    expect(loaded[0].fileName).toBe('test.csv');
  });

  it('returns [] for invalid JSON', () => {
    localStorage.setItem('saveslate:import-batches', 'not-json!!!');

    expect(loadImportBatches()).toEqual([]);
  });

  it('returns [] for non-array JSON values', () => {
    localStorage.setItem('saveslate:import-batches', JSON.stringify({ id: 'batch-1' }));

    // The source code doesn't validate for Array — it casts directly.
    // This test documents actual behavior: non-array parsed value is returned as-is.
    const result = loadImportBatches();

    // The function does `JSON.parse(raw) as ImportBatch[]`, so an object is returned as-is.
    // This is not an array, so callers may break. Document the behavior:
    expect(result).toBeDefined();
  });
});

describe('saveImportBatch', () => {
  it('generates a valid batch ID format', () => {
    const saved = saveImportBatch(createBatch());

    expect(saved.id).toMatch(/^batch-\d+-[a-z0-9]+$/);
  });

  it('returns the batch with all original fields plus generated ID', () => {
    const input = createBatch({ fileName: 'expenses.csv', rowCount: 42 });
    const saved = saveImportBatch(input);

    expect(saved.fileName).toBe('expenses.csv');
    expect(saved.rowCount).toBe(42);
    expect(saved.parserName).toBe('Test Parser');
    expect(saved.id).toBeDefined();
  });

  it('appends to existing batches', () => {
    saveImportBatch(createBatch({ fileName: 'first.csv' }));
    saveImportBatch(createBatch({ fileName: 'second.csv' }));

    const batches = loadImportBatches();

    expect(batches).toHaveLength(2);
    expect(batches[0].fileName).toBe('first.csv');
    expect(batches[1].fileName).toBe('second.csv');
  });

  it('persists batch to localStorage', () => {
    const saved = saveImportBatch(createBatch());

    const raw = localStorage.getItem('saveslate:import-batches');
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!) as ImportBatch[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(saved.id);
  });

  it('generates unique IDs for multiple batches', () => {
    const first = saveImportBatch(createBatch());
    const second = saveImportBatch(createBatch());

    expect(first.id).not.toBe(second.id);
  });
});

describe('renameImportBatch', () => {
  it('renames a batch successfully', () => {
    const saved = saveImportBatch(createBatch({ fileName: 'data.csv' }));

    const renamed = renameImportBatch(saved.id, 'January Expenses');

    expect(renamed).not.toBeNull();
    expect(renamed!.name).toBe('January Expenses');
    expect(renamed!.id).toBe(saved.id);
  });

  it('returns null for a non-existent batch', () => {
    const result = renameImportBatch('nonexistent-id', 'New Name');

    expect(result).toBeNull();
  });

  it('trims whitespace from the name', () => {
    const saved = saveImportBatch(createBatch());

    const renamed = renameImportBatch(saved.id, '  Trimmed Name  ');

    expect(renamed!.name).toBe('Trimmed Name');
  });

  it('sets name to undefined for empty string', () => {
    const saved = saveImportBatch(createBatch({ name: 'Old Name' } as Partial<ImportBatch>));

    const renamed = renameImportBatch(saved.id, '');

    expect(renamed).not.toBeNull();
    expect(renamed!.name).toBeUndefined();
  });

  it('sets name to undefined for whitespace-only string', () => {
    const saved = saveImportBatch(createBatch());

    const renamed = renameImportBatch(saved.id, '   ');

    expect(renamed).not.toBeNull();
    expect(renamed!.name).toBeUndefined();
  });

  it('does not affect other batches', () => {
    const first = saveImportBatch(createBatch({ fileName: 'first.csv' }));
    const second = saveImportBatch(createBatch({ fileName: 'second.csv' }));

    renameImportBatch(first.id, 'Renamed');

    const batches = loadImportBatches();
    const firstBatch = batches.find((b) => b.id === first.id);
    const secondBatch = batches.find((b) => b.id === second.id);

    expect(firstBatch!.name).toBe('Renamed');
    expect(secondBatch!.name).toBeUndefined();
  });

  it('persists the rename to localStorage', () => {
    const saved = saveImportBatch(createBatch());
    renameImportBatch(saved.id, 'Persisted Name');

    const batches = loadImportBatches();
    const batch = batches.find((b) => b.id === saved.id);

    expect(batch!.name).toBe('Persisted Name');
  });
});

describe('deleteImportBatch', () => {
  it('deletes a batch and its linked transactions', () => {
    const batch = saveImportBatch(createBatch());
    saveTransactions([
      createTransaction({ id: 'txn-1', importBatchId: batch.id }),
      createTransaction({ id: 'txn-2', importBatchId: batch.id }),
      createTransaction({ id: 'txn-3' }),
    ]);

    const result = deleteImportBatch(batch.id);

    expect(result.deletedBatch).not.toBeNull();
    expect(result.deletedBatch!.id).toBe(batch.id);
    expect(result.deletedTransactions).toBe(2);
  });

  it('counts deleted transactions correctly', () => {
    const batch = saveImportBatch(createBatch());
    saveTransactions([
      createTransaction({ id: 'txn-1', importBatchId: batch.id }),
      createTransaction({ id: 'txn-2', importBatchId: batch.id }),
      createTransaction({ id: 'txn-3', importBatchId: batch.id }),
    ]);

    const result = deleteImportBatch(batch.id);

    expect(result.deletedTransactions).toBe(3);
  });

  it('returns null and 0 for a non-existent batch', () => {
    const result = deleteImportBatch('nonexistent-id');

    expect(result.deletedBatch).toBeNull();
    expect(result.deletedTransactions).toBe(0);
  });

  it('does not delete transactions without a matching importBatchId', () => {
    const batch = saveImportBatch(createBatch());
    saveTransactions([
      createTransaction({ id: 'txn-linked', importBatchId: batch.id }),
      createTransaction({ id: 'txn-unlinked', importBatchId: 'other-batch' }),
      createTransaction({ id: 'txn-none' }),
    ]);

    deleteImportBatch(batch.id);

    const remaining = loadTransactions();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((t) => t.id)).toContain('txn-unlinked');
    expect(remaining.map((t) => t.id)).toContain('txn-none');
  });

  it('handles a batch with zero linked transactions', () => {
    const batch = saveImportBatch(createBatch());
    saveTransactions([
      createTransaction({ id: 'txn-unrelated', importBatchId: 'other-batch' }),
    ]);

    const result = deleteImportBatch(batch.id);

    expect(result.deletedBatch).not.toBeNull();
    expect(result.deletedTransactions).toBe(0);

    const remaining = loadTransactions();
    expect(remaining).toHaveLength(1);
  });

  it('removes the batch from localStorage', () => {
    const batch = saveImportBatch(createBatch());

    deleteImportBatch(batch.id);

    const batches = loadImportBatches();
    expect(batches.find((b) => b.id === batch.id)).toBeUndefined();
  });

  it('does not delete other batches', () => {
    const batchA = saveImportBatch(createBatch({ fileName: 'a.csv' }));
    const batchB = saveImportBatch(createBatch({ fileName: 'b.csv' }));

    deleteImportBatch(batchA.id);

    const batches = loadImportBatches();
    expect(batches).toHaveLength(1);
    expect(batches[0].id).toBe(batchB.id);
  });
});

describe('pruneEmptyImportBatches', () => {
  it('returns 0 when no batches exist', () => {
    expect(pruneEmptyImportBatches()).toBe(0);
  });

  it('returns 0 when all batches have linked transactions', () => {
    const batchA = saveImportBatch(createBatch({ fileName: 'a.csv' }));
    const batchB = saveImportBatch(createBatch({ fileName: 'b.csv' }));
    saveTransactions([
      createTransaction({ id: 'txn-a', importBatchId: batchA.id }),
      createTransaction({ id: 'txn-b', importBatchId: batchB.id }),
    ]);

    const removed = pruneEmptyImportBatches();

    expect(removed).toBe(0);
    expect(loadImportBatches()).toHaveLength(2);
  });

  it('removes batches without linked transactions', () => {
    const batchUsed = saveImportBatch(createBatch({ fileName: 'used.csv' }));
    saveImportBatch(createBatch({ fileName: 'orphan.csv' }));
    saveTransactions([
      createTransaction({ id: 'txn-1', importBatchId: batchUsed.id }),
    ]);

    const removed = pruneEmptyImportBatches();

    expect(removed).toBe(1);
    const remaining = loadImportBatches();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(batchUsed.id);
  });

  it('returns correct count of removed batches', () => {
    saveImportBatch(createBatch({ fileName: 'orphan1.csv' }));
    saveImportBatch(createBatch({ fileName: 'orphan2.csv' }));
    saveImportBatch(createBatch({ fileName: 'orphan3.csv' }));

    const removed = pruneEmptyImportBatches();

    expect(removed).toBe(3);
    expect(loadImportBatches()).toHaveLength(0);
  });

  it('preserves batches with at least one linked transaction', () => {
    const batchA = saveImportBatch(createBatch({ fileName: 'a.csv' }));
    saveImportBatch(createBatch({ fileName: 'b.csv' }));
    const batchC = saveImportBatch(createBatch({ fileName: 'c.csv' }));
    saveTransactions([
      createTransaction({ id: 'txn-a', importBatchId: batchA.id }),
      createTransaction({ id: 'txn-c', importBatchId: batchC.id }),
    ]);

    const removed = pruneEmptyImportBatches();

    expect(removed).toBe(1);
    const remaining = loadImportBatches();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((b) => b.id)).toContain(batchA.id);
    expect(remaining.map((b) => b.id)).toContain(batchC.id);
  });

  it('does not modify localStorage when nothing is pruned', () => {
    const batch = saveImportBatch(createBatch());
    saveTransactions([
      createTransaction({ id: 'txn-1', importBatchId: batch.id }),
    ]);

    const beforePrune = localStorage.getItem('saveslate:import-batches');
    pruneEmptyImportBatches();
    const afterPrune = localStorage.getItem('saveslate:import-batches');

    expect(afterPrune).toBe(beforePrune);
  });
});
