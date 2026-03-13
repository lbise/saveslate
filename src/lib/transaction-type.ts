import type { Category, Transaction, TransactionType } from '../types';

export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';
export const UNCATEGORIZED_CATEGORY_NAME = 'Uncategorized';

export function inferTransactionType(
  transaction: Pick<Transaction, 'amount'> & Partial<Pick<Transaction, 'transferPairId'>>,
): TransactionType {
  if (transaction.transferPairId) return 'transfer';
  return transaction.amount < 0 ? 'expense' : 'income';
}

export function isUncategorizedCategory(
  categoryId: string | null | undefined,
  category?: Partial<Category> | null,
): boolean {
  if (!categoryId) {
    return true;
  }

  if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
    return true;
  }

  if (!category) {
    return false;
  }

  return category.name === UNCATEGORIZED_CATEGORY_NAME
    && (category.source === 'system' || category.hidden === true || category.isHidden === true);
}
