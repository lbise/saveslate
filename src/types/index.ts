// Core domain types for MeloMoney

export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash';

export type SplitStatus = 'pending' | 'reimbursed';

export interface Tag {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string;
  type?: TransactionType; // Optional hint for filtering in dropdowns
  isDefault?: boolean; // System-provided vs user-created
  goalId?: string; // If set, this tag is tied to a goal
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  deadline?: string; // ISO date string
  tagId: string; // The auto-created tag for this goal
  createdAt: string;
  isArchived?: boolean;
}

export interface SplitInfo {
  ratio: number; // 0.0-1.0, your portion (0.5 = 50%)
  status: SplitStatus;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  tagIds: string[];
  description: string;
  date: string; // ISO date string
  accountId: string;
  split?: SplitInfo;
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

// Computed/derived types
export interface TransactionWithDetails extends Transaction {
  tags: Tag[];
  account: Account;
  goal?: Goal;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage
}

export interface TagSpending {
  tag: Tag;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface GoalProgress {
  goal: Goal;
  currentAmount: number;
  percentage: number;
  transactionCount: number;
}
