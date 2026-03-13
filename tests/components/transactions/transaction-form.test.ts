import { describe, expect, it } from 'vitest';
import {
  createTransactionFormState,
  toTransactionFormSubmitPayload,
  type TransactionFormState,
} from '../../../src/components/transactions/transaction-form';
import type { Account, Category, Transaction } from '../../../src/types';

const accounts: Account[] = [
  {
    id: 'account-main',
    name: 'Main Account',
    type: 'checking',
    balance: 0,
    currency: 'CHF',
    icon: 'Wallet',
  },
];

const categories: Category[] = [
  {
    id: 'groceries',
    name: 'Groceries',
    icon: 'ShoppingCart',
    source: 'custom',
    isDefault: false,
    isHidden: false,
  },
];

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    amount: -24.5,
    currency: 'CHF',
    categoryId: 'groceries',
    description: 'Groceries',
    date: '2026-01-15',
    accountId: 'account-main',
    ...overrides,
  };
}

function createValidFormState(overrides: Partial<TransactionFormState> = {}): TransactionFormState {
  return {
    description: 'Team lunch',
    notes: '',
    transactionId: '',
    direction: 'expense',
    amount: '42.50',
    currency: 'CHF',
    date: '2026-01-15',
    time: '',
    accountId: 'account-main',
    categoryId: 'groceries',
    goalId: '',
    selectedTagIds: [],
    hasSplit: false,
    splitWithPerson: '',
    splitRatioPercent: '50',
    splitStatus: 'pending',
    ...overrides,
  };
}

describe('transaction form notes', () => {
  it('loads existing notes into form state', () => {
    const formState = createTransactionFormState({
      transaction: createTransaction({ notes: 'Keep receipt for reimbursement' }),
      accounts,
      categories,
      defaultCurrency: 'CHF',
    });

    expect(formState.notes).toBe('Keep receipt for reimbursement');
  });

  it('trims non-empty notes in the submit payload', () => {
    const payload = toTransactionFormSubmitPayload(createValidFormState({
      notes: '  Follow up with Alex tomorrow.  ',
    }), {
      accounts,
      categories,
      goals: [],
      tags: [],
      defaultCurrency: 'CHF',
    });

    expect(payload?.notes).toBe('Follow up with Alex tomorrow.');
  });

  it('keeps empty notes in the submit payload so existing notes can be cleared', () => {
    const payload = toTransactionFormSubmitPayload(createValidFormState({
      notes: '   ',
    }), {
      accounts,
      categories,
      goals: [],
      tags: [],
      defaultCurrency: 'CHF',
    });

    expect(payload?.notes).toBe('');
  });
});
