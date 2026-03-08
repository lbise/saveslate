// Core domain types for SaveSlate

// ── User ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface UserSettings {
  defaultCurrency: string; // ISO 4217 code, e.g. 'CHF', 'EUR'
}

// ── Transactions ──────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'retirement';

export type SplitStatus = 'pending' | 'reimbursed';

export type ContributionFrequency = 'weekly' | 'monthly';

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  groupId?: string;
  isDefault?: boolean; // System-provided vs user-created
}

export interface CategoryGroup {
  id: string;
  name: string;
  icon: string;
  order: number;
  isDefault?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  icon: string;
  startingAmount?: number;
  targetAmount: number;
  hasTarget?: boolean;
  expectedContribution?: {
    amount: number;
    frequency: ContributionFrequency;
  };
  deadline?: string; // ISO date string
  createdAt: string;
  isArchived?: boolean;
}

export interface SplitInfo {
  withPerson: string;
  ratio: number; // 0.0-1.0, your portion (0.5 = 50%)
  status: SplitStatus;
}

export interface TransactionMetadataEntry {
  key: string;
  value: string;
  source: 'import' | 'user';
}

export interface Transaction {
  id: string;
  transactionId?: string; // Bank-provided stable transaction identifier for deduplication
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  date: string; // ISO date string
  time?: string; // Optional transaction time in HH:mm:ss
  accountId: string;
  transferPairId?: string; // Links two mirrored transfer legs imported from separate account statements
  transferPairRole?: 'source' | 'destination';
  goalId?: string; // Direct link to a goal this transaction contributes to
  importBatchId?: string; // Links to an ImportBatch if imported from CSV
  split?: SplitInfo;
  tagIds?: string[];
  metadata?: TransactionMetadataEntry[]; // Curated key/value metadata shown in-app
  rawData?: Record<string, string>; // Original CSV row data (header -> value)
}

export interface ImportBatch {
  id: string;
  fileName: string;
  name?: string; // Optional custom name for the import
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
  icon: string; // Lucide icon name
  accountIdentifier?: string; // Optional identifier (e.g. IBAN, account number) for matching imported transactions
}

export type AutomationTrigger = 'on-import' | 'manual-run' | 'on-create';

export type AutomationMatchMode = 'all' | 'any';

export type AutomationConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'starts-with'
  | 'ends-with'
  | 'regex'
  | 'not-regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'exists'
  | 'not-exists';

export interface AutomationCondition {
  id: string;
  field: string;
  operator: AutomationConditionOperator;
  value?: string;
}

export interface SetCategoryAutomationAction {
  type: 'set-category';
  categoryId: string;
  overwriteExisting?: boolean;
}

export interface SetGoalAutomationAction {
  type: 'set-goal';
  goalId: string;
  overwriteExisting?: boolean;
}

export type AutomationAction = SetCategoryAutomationAction | SetGoalAutomationAction;

export interface AutomationRule {
  id: string;
  name: string;
  isEnabled: boolean;
  triggers: AutomationTrigger[];
  matchMode: AutomationMatchMode;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  applyToUncategorizedOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRulePrefillCondition {
  field: string;
  operator: AutomationConditionOperator;
  value?: string;
}

export interface AutomationRulePrefillDraft {
  name?: string;
  categoryId?: string;
  goalId?: string;
  isEnabled?: boolean;
  triggers?: AutomationTrigger[];
  matchMode?: AutomationMatchMode;
  applyToUncategorizedOnly?: boolean;
  conditions?: AutomationRulePrefillCondition[];
  mergeIntoExistingCategoryRule?: boolean;
}

export interface RulesRouteState {
  prefillRuleDraft?: AutomationRulePrefillDraft;
}

// Computed/derived types
export interface TransactionWithDetails extends Transaction {
  type: TransactionType; // Inferred from amount sign + transfer linkage
  category: Category;
  account: Account;
  destinationAccount?: Account; // Resolved counterpart account for linked transfers
  goal?: Goal;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number; // sum of transfer amounts (absolute value)
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

/** String-valued ParsedRow fields that can be source/target for transforms. */
export type TransformableField = 'description' | 'category' | 'currency';

/** A regex-based rule that transforms an extracted field value. */
export interface FieldTransform {
  label?: string;
  sourceField: TransformableField;
  targetField: TransformableField;
  matchPattern: string;   // regex — does the source value match?
  extractPattern: string; // regex with named capture groups
  replacement: string;    // template using {{groupName}} syntax
}

export type AmountFormat = 'single' | 'debit-credit' | 'amount-type';

export type CsvDelimiter = ',' | ';' | '\t' | '|';

export type TimeMode = 'none' | 'separate-column' | 'in-date-column';

export type TransactionField =
  | 'description'
  | 'transactionId'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'amountType'
  | 'date'
  | 'time'
  | 'category'
  | 'currency'
  | 'ignore';

export const TRANSACTION_FIELD_LABELS: Record<TransactionField, string> = {
  description: 'Description',
  transactionId: 'Transaction ID',
  amount: 'Amount',
  debit: 'Debit',
  credit: 'Credit',
  amountType: 'Debit/Credit indicator',
  date: 'Date',
  time: 'Time',
  category: 'Category',
  currency: 'Currency',
  ignore: 'Ignore',
};

export interface ColumnMapping {
  field: TransactionField;
  /** Column indices from the CSV. String fields (description, category) support multiple. */
  columnIndices: number[];
}

export interface MetadataMapping {
  key: string;
  /** One or more CSV columns concatenated with parser separator. */
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
  timeMode: TimeMode;
  timeFormat?: string; // e.g. "HH:mm", used when timeMode is separate-column
  dateFormat: string; // e.g. "DD.MM.YYYY", "YYYY-MM-DD"
  decimalSeparator: '.' | ',';
  /** Separator used when concatenating multiple CSV columns into one field. Defaults to ' '. */
  multiColumnSeparator?: string;
  /** Optional metadata mappings to persist as key/value pairs on transactions. */
  metadataMappings?: MetadataMapping[];
  transforms?: FieldTransform[];
  /** Regex pattern to extract an account identifier (e.g. IBAN) from skipped header rows (optional) */
  accountPattern?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedRow {
  description: string;
  transactionId?: string;
  amount: number;
  date: string; // normalized to ISO
  time?: string; // normalized to HH:mm:ss
  category?: string;
  currency?: string;
  metadata?: TransactionMetadataEntry[];
  raw: Record<string, string>; // original row data
  errors: string[]; // per-row parsing issues
}

export type ImportStep = 'upload' | 'parser' | 'preview' | 'complete';
