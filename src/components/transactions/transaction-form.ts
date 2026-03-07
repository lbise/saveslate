import type {
  Account,
  Category,
  Goal,
  SplitStatus,
  Tag,
  Transaction,
} from '../../types';

export type TransactionFormDirection = 'expense' | 'income';

export interface TransactionFormState {
  description: string;
  transactionId: string;
  direction: TransactionFormDirection;
  amount: string;
  currency: string;
  date: string;
  time: string;
  accountId: string;
  categoryId: string;
  goalId: string;
  selectedTagIds: string[];
  hasSplit: boolean;
  splitWithPerson: string;
  splitRatioPercent: string;
  splitStatus: SplitStatus;
}

export interface TransactionFormSubmitPayload {
  transactionId?: string;
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  date: string;
  time?: string;
  accountId: string;
  goalId?: string;
  split?: Transaction['split'];
  tagIds?: string[];
}

function isSplitStatus(value: string): value is SplitStatus {
  return value === 'pending' || value === 'reimbursed';
}

function getDefaultCategoryId(categories: Category[]): string {
  if (categories.length === 0) {
    return '';
  }

  return categories.find((category) => category.id === 'uncategorized')?.id
    ?? categories[0].id;
}

export function createTransactionFormState(params: {
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
}): TransactionFormState {
  const { transaction, accounts, categories } = params;
  const today = new Date().toISOString().split('T')[0];
  const defaultAccountId = accounts[0]?.id ?? '';
  const defaultCurrency = accounts[0]?.currency ?? 'CHF';
  const defaultCategoryId = getDefaultCategoryId(categories);

  if (!transaction) {
    return {
      description: '',
      transactionId: '',
      direction: 'expense',
      amount: '',
      currency: defaultCurrency,
      date: today,
      time: '',
      accountId: defaultAccountId,
      categoryId: defaultCategoryId,
      goalId: '',
      selectedTagIds: [],
      hasSplit: false,
      splitWithPerson: '',
      splitRatioPercent: '50',
      splitStatus: 'pending',
    };
  }

  return {
    description: transaction.description,
    transactionId: transaction.transactionId ?? '',
    direction: transaction.amount < 0 ? 'expense' : 'income',
    amount: String(Math.abs(transaction.amount)),
    currency: transaction.currency || defaultCurrency,
    date: transaction.date,
    time: transaction.time ?? '',
    accountId: transaction.accountId || defaultAccountId,
    categoryId: transaction.categoryId || defaultCategoryId,
    goalId: transaction.goalId ?? '',
    selectedTagIds: transaction.tagIds ?? [],
    hasSplit: Boolean(transaction.split),
    splitWithPerson: transaction.split?.withPerson ?? '',
    splitRatioPercent: String(Math.round((transaction.split?.ratio ?? 0.5) * 100)),
    splitStatus: transaction.split?.status ?? 'pending',
  };
}

export function toTransactionFormSubmitPayload(
  form: TransactionFormState,
  options: {
    accounts: Account[];
    categories: Category[];
    goals: Goal[];
    tags: Tag[];
  },
): TransactionFormSubmitPayload | null {
  const description = form.description.trim();
  const accountId = form.accountId.trim();
  const categoryId = form.categoryId.trim();
  const date = form.date.trim();
  const currency = form.currency.trim().toUpperCase();
  const absoluteAmount = Number(form.amount);

  if (!description || !date || !accountId || !categoryId) {
    return null;
  }

  if (!Number.isFinite(absoluteAmount) || absoluteAmount <= 0) {
    return null;
  }

  if (!options.accounts.some((account) => account.id === accountId)) {
    return null;
  }

  if (!options.categories.some((category) => category.id === categoryId)) {
    return null;
  }

  const goalId = form.goalId.trim();
  if (goalId && !options.goals.some((goal) => goal.id === goalId)) {
    return null;
  }

  const splitRatioPercent = Number(form.splitRatioPercent);
  if (
    form.hasSplit
    && (
      !form.splitWithPerson.trim()
      || !Number.isFinite(splitRatioPercent)
      || splitRatioPercent <= 0
      || splitRatioPercent >= 100
      || !isSplitStatus(form.splitStatus)
    )
  ) {
    return null;
  }

  const signedAmount = form.direction === 'expense'
    ? -Math.abs(absoluteAmount)
    : Math.abs(absoluteAmount);

  const validTagIds = new Set(options.tags.map((tag) => tag.id));
  const tagIds = Array.from(new Set(
    form.selectedTagIds.filter((tagId) => validTagIds.has(tagId)),
  ));

  const payload: TransactionFormSubmitPayload = {
    transactionId: form.transactionId.trim() || undefined,
    amount: signedAmount,
    currency: currency || options.accounts[0]?.currency || 'CHF',
    categoryId,
    description,
    date,
    time: form.time.trim() || undefined,
    accountId,
    goalId: goalId || undefined,
    split: form.hasSplit
      ? {
        withPerson: form.splitWithPerson.trim(),
        ratio: splitRatioPercent / 100,
        status: form.splitStatus,
      }
      : undefined,
    tagIds: tagIds.length > 0 ? tagIds : undefined,
  };

  return payload;
}
