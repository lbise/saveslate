import type { Transaction, TransactionType } from '../types';

export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';

export function inferTransactionType(
  transaction: Pick<Transaction, 'amount'> & Partial<Pick<Transaction, 'transferPairId'>>,
): TransactionType {
  if (transaction.transferPairId) return 'transfer';
  return transaction.amount < 0 ? 'expense' : 'income';
}
