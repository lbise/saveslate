// Auth
export {
  useLogin,
  useRegister,
  useLogout,
  useUpdateProfile,
  useClearAllData,
  authKeys,
} from './use-auth';

// Accounts
export {
  useAccounts,
  useAccount,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  accountKeys,
} from './use-accounts';

// Transactions
export {
  useTransactions,
  useTransaction,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useBulkCreateTransactions,
  useBulkDeleteTransactions,
  transactionKeys,
} from './use-transactions';
export type { TransactionFilters } from './use-transactions';

// Categories
export {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useSeedCategories,
  categoryKeys,
} from './use-categories';

// Category Groups
export {
  useCategoryGroups,
  useCreateCategoryGroup,
  useUpdateCategoryGroup,
  useDeleteCategoryGroup,
  categoryGroupKeys,
} from './use-category-groups';

// Goals
export {
  useGoals,
  useGoal,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  goalKeys,
} from './use-goals';

// Tags
export {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  tagKeys,
} from './use-tags';

// Automation Rules
export {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useRunAutomationRules,
  useTestAutomationRule,
  automationRuleKeys,
} from './use-automation-rules';

// CSV Parsers
export {
  useCsvParsers,
  useCsvParser,
  useCreateCsvParser,
  useUpdateCsvParser,
  useDeleteCsvParser,
  toCsvParserConfig,
  csvParserKeys,
} from './use-csv-parsers';

// Import Batches
export {
  useImportBatches,
  useCreateImportBatch,
  useUpdateImportBatch,
  useDeleteImportBatch,
  importBatchKeys,
} from './use-import-batches';

// Analytics
export {
  useAnalyticsSummary,
  useAnalyticsByMonth,
  useAnalyticsByCategory,
  useAccountBalances,
  useGoalProgress,
  analyticsKeys,
} from './use-analytics';
export type { AnalyticsFilters, CategoryAnalyticsFilters } from './use-analytics';

// CSV Import
export {
  useCsvPreview,
  useCsvImport,
} from './use-csv-import';
export type { CsvPreviewResult } from './use-csv-import';
