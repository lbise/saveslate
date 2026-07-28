import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useUncategorizedReview } from '../../src/hooks/useUncategorizedReview';

interface TestTransaction {
  id: string;
  category: string;
}

const UNCATEGORIZED: TestTransaction[] = [
  { id: 'tx-1', category: 'Uncategorized' },
  { id: 'tx-2', category: 'Uncategorized' },
];

describe('useUncategorizedReview', () => {
  it('keeps the initial cohort visible with its latest data', () => {
    const { result, rerender } = renderHook(
      ({ transactions, isActive }: {
        transactions: TestTransaction[];
        isActive: boolean;
      }) => useUncategorizedReview(transactions, isActive),
      {
        initialProps: {
          transactions: UNCATEGORIZED,
          isActive: false,
        },
      },
    );

    act(() => result.current.startReview(UNCATEGORIZED));
    rerender({ transactions: UNCATEGORIZED, isActive: true });

    const updatedTransactions = [
      { id: 'tx-1', category: 'Groceries' },
      { id: 'tx-2', category: 'Uncategorized' },
      { id: 'tx-3', category: 'Uncategorized' },
    ];
    rerender({ transactions: updatedTransactions, isActive: true });

    expect(result.current.reviewedTransactions).toEqual([
      { id: 'tx-1', category: 'Groceries' },
      { id: 'tx-2', category: 'Uncategorized' },
    ]);
  });

  it('drops deleted rows and starts fresh after review is stopped', () => {
    const { result, rerender } = renderHook(
      ({ transactions, isActive }: {
        transactions: TestTransaction[];
        isActive: boolean;
      }) => useUncategorizedReview(transactions, isActive),
      {
        initialProps: {
          transactions: UNCATEGORIZED,
          isActive: true,
        },
      },
    );

    act(() => result.current.startReview(UNCATEGORIZED));
    rerender({
      transactions: [{ id: 'tx-2', category: 'Uncategorized' }],
      isActive: true,
    });
    expect(result.current.reviewedTransactions?.map(({ id }) => id)).toEqual(['tx-2']);

    act(() => result.current.stopReview());
    rerender({
      transactions: [{ id: 'tx-3', category: 'Uncategorized' }],
      isActive: false,
    });
    expect(result.current.reviewedTransactions).toBeNull();

    act(() => result.current.startReview([
      { id: 'tx-3', category: 'Uncategorized' },
    ]));
    rerender({
      transactions: [{ id: 'tx-3', category: 'Uncategorized' }],
      isActive: true,
    });
    expect(result.current.reviewedTransactions?.map(({ id }) => id)).toEqual(['tx-3']);
  });
});
