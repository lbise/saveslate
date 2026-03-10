import type { Account, AccountType } from '../../types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
  cash: 'Cash',
  investment: 'Investment',
  retirement: 'Retirement',
};

export const ACCOUNT_TYPE_DEFAULT_ICONS: Record<AccountType, string> = {
  checking: 'Wallet',
  savings: 'PiggyBank',
  credit: 'CreditCard',
  cash: 'Banknote',
  investment: 'TrendingUp',
  retirement: 'Landmark',
};

export interface AccountFormState {
  name: string;
  type: AccountType;
  startingBalance: string;
  currency: string;
  accountIdentifier: string;
  icon: string;
}

export interface AccountFormSubmitPayload {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  icon: string;
  accountIdentifier?: string;
}

export const DEFAULT_ACCOUNT_FORM_STATE: AccountFormState = {
  name: '',
  type: 'checking',
  startingBalance: '0',
  currency: 'CHF',
  accountIdentifier: '',
  icon: ACCOUNT_TYPE_DEFAULT_ICONS.checking,
};

export function createAccountFormStateFromAccount(account: Account): AccountFormState {
  return {
    name: account.name,
    type: account.type,
    startingBalance: String(account.balance),
    currency: account.currency,
    accountIdentifier: account.accountIdentifier ?? '',
    icon: account.icon,
  };
}

export function toAccountFormSubmitPayload(
  form: AccountFormState,
  fallbackCurrency = 'CHF',
): AccountFormSubmitPayload | null {
  const accountName = form.name.trim();
  const startingBalance = Number(form.startingBalance);
  if (!accountName || Number.isNaN(startingBalance) || !Number.isFinite(startingBalance)) {
    return null;
  }

  return {
    name: accountName,
    type: form.type,
    balance: startingBalance,
    currency: form.currency.trim().toUpperCase() || fallbackCurrency,
    icon: form.icon.trim() || ACCOUNT_TYPE_DEFAULT_ICONS[form.type],
    accountIdentifier: form.accountIdentifier.trim() || undefined,
  };
}
