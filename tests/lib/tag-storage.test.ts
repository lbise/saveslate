import { describe, expect, it } from 'vitest';
import { loadTransactions, saveTransactions } from '../../src/lib/transaction-storage';
import { addTag, deleteTag, loadTags, updateTag } from '../../src/lib/tag-storage';
import type { Transaction } from '../../src/types';

function createTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'txn-default',
    amount: -10,
    currency: 'CHF',
    categoryId: 'groceries',
    description: 'Test transaction',
    date: '2026-01-01',
    accountId: 'account-main',
    ...overrides,
  };
}

describe('tag storage', () => {
  it('adds a tag with normalized name and color', () => {
    const addedTag = addTag({
      name: '  Tax   deductible ',
      color: '#55aec8',
    });

    expect(addedTag.name).toBe('Tax deductible');
    expect(addedTag.color).toBe('#55AEC8');

    const storedTags = loadTags();
    expect(storedTags).toHaveLength(1);
    expect(storedTags[0].id).toBe(addedTag.id);
  });

  it('falls back to default color when non-preset color is used', () => {
    const addedTag = addTag({
      name: 'Custom color not allowed',
      color: '#ABCDEF',
    });

    expect(addedTag.color).toBe('#55AEC8');
  });

  it('prevents duplicate names ignoring letter case', () => {
    addTag({
      name: 'Tax',
      color: '#55AEC8',
    });

    expect(() => addTag({
      name: '  tax  ',
      color: '#4FD08A',
    })).toThrow('A tag with this name already exists.');
  });

  it('prevents updates that would create duplicate names', () => {
    const taxTag = addTag({
      name: 'Tax',
      color: '#55AEC8',
    });
    const groceriesTag = addTag({
      name: 'Groceries',
      color: '#4FD08A',
    });

    expect(() => updateTag(groceriesTag.id, { name: taxTag.name })).toThrow('A tag with this name already exists.');
  });

  it('deletes tags and unlinks them from transactions', () => {
    const keepTag = addTag({
      name: 'Keep',
      color: '#6AA7FF',
    });
    const deleteMeTag = addTag({
      name: 'Delete me',
      color: '#EF6A6A',
    });

    saveTransactions([
      createTransaction({
        id: 'txn-1',
        tagIds: [keepTag.id, deleteMeTag.id],
      }),
      createTransaction({
        id: 'txn-2',
        tagIds: [deleteMeTag.id],
      }),
    ]);

    const deleteResult = deleteTag(deleteMeTag.id);

    expect(deleteResult.deleted).toBe(true);
    expect(deleteResult.unlinkedTransactions).toBe(2);
    expect(loadTags().map((tag) => tag.id)).toEqual([keepTag.id]);

    const transactions = loadTransactions();
    const first = transactions.find((transaction) => transaction.id === 'txn-1');
    const second = transactions.find((transaction) => transaction.id === 'txn-2');

    expect(first?.tagIds).toEqual([keepTag.id]);
    expect(second?.tagIds).toBeUndefined();
  });
});
