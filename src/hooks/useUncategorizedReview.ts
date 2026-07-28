import { useCallback, useMemo, useState } from 'react';

interface ReviewItem {
  id: string;
}

interface UncategorizedReviewResult<T extends ReviewItem> {
  reviewedTransactions: T[] | null;
  startReview: (transactions: T[]) => void;
  stopReview: () => void;
}

/**
 * Keeps a fixed review cohort while resolving each ID to the latest transaction
 * data. New uncategorized transactions wait for the next review session.
 */
export function useUncategorizedReview<T extends ReviewItem>(
  transactions: T[],
  isActive: boolean,
): UncategorizedReviewResult<T> {
  const [transactionIds, setTransactionIds] = useState<ReadonlySet<string> | null>(null);

  const startReview = useCallback((reviewTransactions: T[]) => {
    setTransactionIds(new Set(reviewTransactions.map((transaction) => transaction.id)));
  }, []);

  const stopReview = useCallback(() => {
    setTransactionIds(null);
  }, []);

  const reviewedTransactions = useMemo(() => {
    if (!isActive || transactionIds === null) {
      return null;
    }

    return transactions.filter((transaction) => transactionIds.has(transaction.id));
  }, [isActive, transactionIds, transactions]);

  return {
    reviewedTransactions,
    startReview,
    stopReview,
  };
}
