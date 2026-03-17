import type { Category, CategoryGroup, Transaction, TransactionType } from '../types';

export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';
export const UNCATEGORIZED_CATEGORY_NAME = 'Uncategorized';

export function inferTransactionType(
  transaction: Pick<Transaction, 'amount'> & Partial<Pick<Transaction, 'transferPairId'>>,
): TransactionType {
  if (transaction.transferPairId) return 'transfer';
  return transaction.amount < 0 ? 'expense' : 'income';
}

export function resolveTransactionCategoryType(
  transaction: Pick<Transaction, 'amount' | 'categoryId'> & Partial<Pick<Transaction, 'transferPairId'>>,
  category: Partial<Pick<Category, 'groupId' | 'name' | 'source' | 'hidden' | 'isHidden'>> | null | undefined,
  categoryGroupsById: ReadonlyMap<string, Pick<CategoryGroup, 'type'>>,
): TransactionType {
  if (isUncategorizedCategory(transaction.categoryId, category)) {
    return inferTransactionType(transaction);
  }

  if (category?.groupId) {
    const categoryType = categoryGroupsById.get(category.groupId)?.type;
    if (categoryType) {
      return categoryType;
    }
  }

  return inferTransactionType(transaction);
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
