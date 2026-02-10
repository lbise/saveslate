import type { Account } from '../../types';

// Swiss-flavored accounts with playful colors
export const ACCOUNTS: Account[] = [
  {
    id: 'main-checking',
    name: 'Daily Vibes',
    type: 'checking',
    balance: 4250.75,
    currency: 'CHF',
    color: '#3b82f6', // blue
    icon: 'Wallet',
    iban: 'CH28 0029 0290 F030 5556 0',
  },
  {
    id: 'savings',
    name: 'Dream Fund',
    type: 'savings',
    balance: 12800.0,
    currency: 'CHF',
    color: '#10b981', // emerald
    icon: 'PiggyBank',
    iban: 'CH48 0075 3123 4000 0010 0',
  },
  {
    id: 'credit-card',
    name: 'Swipe Machine',
    type: 'credit',
    balance: -890.50,
    currency: 'CHF',
    color: '#f97316', // orange
    icon: 'CreditCard',
    iban: 'CH35 0077 0016 1500 5325 9',
  },
  {
    id: 'cash',
    name: 'Pocket Money',
    type: 'cash',
    balance: 185.0,
    currency: 'CHF',
    color: '#a855f7', // purple
    icon: 'Banknote',
    // Cash has no IBAN
  },
];

export const getAccountById = (id: string): Account | undefined => {
  return ACCOUNTS.find((acc) => acc.id === id);
};

export const getTotalBalance = (): number => {
  return ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);
};

export const getNetWorth = (): number => {
  return ACCOUNTS.reduce((sum, acc) => {
    // Credit cards show negative balance (debt)
    return sum + acc.balance;
  }, 0);
};
