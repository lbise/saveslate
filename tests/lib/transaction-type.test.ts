import { describe, expect, it } from 'vitest';
import { inferTransactionType, resolveTransactionCategoryType } from '../../src/lib/transaction-type';

describe('inferTransactionType', () => {
  it('returns transfer when transfer pair id is present', () => {
    expect(inferTransactionType({ amount: -50, transferPairId: 'pair-1' })).toBe('transfer');
    expect(inferTransactionType({ amount: 50, transferPairId: 'pair-2' })).toBe('transfer');
  });

  it('returns expense for negative amounts without transfer linkage', () => {
    expect(inferTransactionType({ amount: -1 })).toBe('expense');
  });

  it('returns income for positive amounts without transfer linkage', () => {
    expect(inferTransactionType({ amount: 1 })).toBe('income');
  });
});

describe('resolveTransactionCategoryType', () => {
  it('uses the category group type when available', () => {
    const result = resolveTransactionCategoryType(
      { amount: -42, categoryId: 'cat-1' },
      { name: 'Salary', groupId: 'group-income' },
      new Map([['group-income', { type: 'income' }]]),
    );

    expect(result).toBe('income');
  });

  it('falls back to inferred type for uncategorized categories', () => {
    const result = resolveTransactionCategoryType(
      { amount: 2500, categoryId: 'uncategorized' },
      { name: 'Uncategorized', source: 'system', hidden: true },
      new Map([['system', { type: 'expense' }]]),
    );

    expect(result).toBe('income');
  });
});
