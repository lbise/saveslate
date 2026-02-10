// Core domain types for MeloMoney

export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash';

export type SplitStatus = 'pending' | 'reimbursed';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string; // Lucide icon name
  isDefault?: boolean; // System-provided vs user-created
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  deadline?: string; // ISO date string
  createdAt: string;
  isArchived?: boolean;
}

export interface SplitInfo {
  withPerson: string;
  ratio: number; // 0.0-1.0, your portion (0.5 = 50%)
  status: SplitStatus;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  date: string; // ISO date string
  accountId: string;
  goalId?: string; // Direct link to a goal this transaction contributes to
  importBatchId?: string; // Links to an ImportBatch if imported from CSV
  split?: SplitInfo;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: string; // ISO date string
  parserName: string;
  parserId: string;
  rowCount: number;
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

// Computed/derived types
export interface TransactionWithDetails extends Transaction {
  category: Category;
  account: Account;
  goal?: Goal;
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

export interface GoalProgress {
  goal: Goal;
  currentAmount: number;
  percentage: number;
  transactionCount: number;
}

// ─── CSV Import Types ────────────────────────────────────────

export type AmountFormat = 'single' | 'debit-credit' | 'amount-type';

export type CsvDelimiter = ',' | ';' | '\t' | '|';

export type TransactionField =
  | 'description'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'amountType'
  | 'date'
  | 'category'
  | 'currency'
  | 'ignore';

export const TRANSACTION_FIELD_LABELS: Record<TransactionField, string> = {
  description: 'Description',
  amount: 'Amount',
  debit: 'Debit',
  credit: 'Credit',
  amountType: 'Debit/Credit indicator',
  date: 'Date',
  category: 'Category',
  currency: 'Currency',
  ignore: 'Ignore',
};

export interface ColumnMapping {
  field: TransactionField;
  /** Column indices from the CSV. String fields (description, category) support multiple. */
  columnIndices: number[];
}

export interface CsvParser {
  id: string;
  name: string;
  delimiter: CsvDelimiter;
  hasHeaderRow: boolean;
  skipRows: number;
  headerPatterns: string[]; // regex patterns for matching headers (case-insensitive)
  columnMappings: ColumnMapping[];
  amountFormat: AmountFormat;
  dateFormat: string; // e.g. "DD.MM.YYYY", "YYYY-MM-DD"
  decimalSeparator: '.' | ',';
  createdAt: string;
  updatedAt: string;
}

export interface ParsedRow {
  description: string;
  amount: number;
  date: string; // normalized to ISO
  category?: string;
  currency?: string;
  raw: Record<string, string>; // original row data
  errors: string[]; // per-row parsing issues
}

export type ImportStep = 'upload' | 'parser' | 'preview' | 'complete';
