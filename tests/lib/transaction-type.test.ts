import { describe, expect, it } from 'vitest';
import { inferTransactionType } from '../../src/lib/transaction-type';

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
