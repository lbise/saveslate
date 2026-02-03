// Core domain types for MeloMoney

export type TransactionType = 'income' | 'expense';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  description: string;
  date: string; // ISO date string
  accountId: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string; // For visual distinction
  icon: string; // Lucide icon name
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string;
  type: TransactionType;
}

// Computed/derived types
export interface TransactionWithDetails extends Transaction {
  category: Category;
  account: Account;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage
}

export interface CategorySpending {
  category: Category;
  amount: number;
  percentage: number;
  transactionCount: number;
}
