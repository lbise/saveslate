// Currency formatting for CHF
export const formatCurrency = (
  amount: number,
  currency: string = 'CHF'
): string => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatSignedCurrency = (
  amount: number,
  currency: string = 'CHF',
): string => {
  if (amount > 0) {
    return `+${formatCurrency(amount, currency)}`;
  }
  if (amount < 0) {
    return `-${formatCurrency(Math.abs(amount), currency)}`;
  }
  return formatCurrency(0, currency);
};

interface TransferFlowAccountsInput {
  amount: number;
  accountName: string;
  counterpartyAccountName: string;
  transferPairRole?: 'source' | 'destination';
}

export const resolveTransferFlowAccounts = ({
  amount,
  accountName,
  counterpartyAccountName,
  transferPairRole,
}: TransferFlowAccountsInput): {
  fromAccountName: string;
  toAccountName: string;
} => {
  const isOutflow = transferPairRole
    ? transferPairRole === 'source'
    : amount < 0;

  if (isOutflow) {
    return {
      fromAccountName: accountName,
      toAccountName: counterpartyAccountName,
    };
  }

  return {
    fromAccountName: counterpartyAccountName,
    toAccountName: accountName,
  };
};

// Format just the number part (for when you want custom currency display)
export const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Date formatting
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-CH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-CH', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return formatDateShort(dateString);
};

// Percentage formatting
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Class name helper (shadcn pattern: clsx + tailwind-merge)
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
