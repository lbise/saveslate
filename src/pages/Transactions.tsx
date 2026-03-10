import { useState, useMemo, useEffect } from "react";
import {
  Search,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  Target,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  SlidersHorizontal,
  Tag,
  Tags,
  Wallet,
  Upload,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageHeaderActions } from "../components/layout";
import { TransactionsSkeleton, QueryError } from "../components/layout";
import {
  TransactionFormModal,
  TransactionRow,
  type TransactionFormSubmitPayload,
} from "../components/transactions";
import {
  DeleteConfirmationModal,
  MultiSelectDropdown,
  PaginationButtons,
} from "../components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  useAccounts,
  useCategories,
  useGoals,
  useTransactions as useTransactionsQuery,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useImportBatches,
  useUpdateImportBatch,
  useDeleteImportBatch,
} from "../hooks/api";
import {
  inferTransactionType,
  UNCATEGORIZED_CATEGORY_ID,
} from "../lib/transaction-type";
import {
  createTransferCounterpartyMap,
  parseFilterIdsFromQuery,
  parseTypeFilterFromQuery,
} from "../lib/transaction-utils";
import { cn } from "../lib/utils";
import { useFormatCurrency, useOnboarding, useTransactionFilters, usePagination } from "../hooks";
import type {
  AutomationRulePrefillDraft,
  Tag as TransactionTag,
  TransactionType,
  TransactionWithDetails as TxDetails,
} from "../types";

const TYPE_LABELS: { value: TransactionType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

const activeTypePillStyles: Record<TransactionType, string> = {
  income: "bg-income/10 text-income border-income/20",
  expense: "bg-expense/10 text-expense border-expense/20",
  transfer: "bg-transfer/10 text-transfer border-transfer/20",
};

const MANUAL_SOURCE_ID = "manual";

interface SourceOption {
  id: string;
  label: string;
  count: number;
  deletable: boolean;
}

export function Transactions() {
  const { formatCurrency, formatSignedCurrency } = useFormatCurrency();
  useOnboarding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTypeFilter = parseTypeFilterFromQuery(searchParams);
  const initialCategoryFilterIds = parseFilterIdsFromQuery(searchParams, "category");
  const initialSourceFilterIds = parseFilterIdsFromQuery(searchParams, "source");
  const initialGoalFilterIds = parseFilterIdsFromQuery(searchParams, "goal");
  const initialAccountFilterIds = parseFilterIdsFromQuery(searchParams, "account");
  const initialTagFilterIds = parseFilterIdsFromQuery(searchParams, "tag");

  // Data from API
  const transactionsResult = useTransactionsQuery({ pageSize: 10000 });
  const categoriesResult = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: goals = [] } = useGoals();
  const { data: tags = [] } = useTags();
  const { data: importBatches = [] } = useImportBatches();

  const rawTransactionsData = transactionsResult.data;
  const allCategories = categoriesResult.data ?? [];

  // Show skeleton while primary data is loading
  const isLoading = transactionsResult.isLoading || categoriesResult.isLoading;
  if (isLoading) return <TransactionsSkeleton />;
  if (transactionsResult.isError) return <QueryError message="Failed to load transactions." onRetry={() => transactionsResult.refetch()} />;
  if (categoriesResult.isError) return <QueryError message="Failed to load categories." onRetry={() => categoriesResult.refetch()} />;

  // Mutation hooks
  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();
  const updateImportBatchMutation = useUpdateImportBatch();
  const deleteImportBatchMutation = useDeleteImportBatch();

  // Enrich transactions with category/account/goal objects
  const transactions = useMemo<TxDetails[]>(() => {
    const items = rawTransactionsData?.items ?? [];
    if (items.length === 0) return [];

    const categoriesById = new Map(allCategories.map(c => [c.id, c]));
    const accountsById = new Map(accounts.map(a => [a.id, a]));
    const goalsById = new Map(goals.map(g => [g.id, g]));
    const counterpartyMap = createTransferCounterpartyMap(items);

    return items.map(tx => {
      const category = categoriesById.get(tx.categoryId) ?? {
        id: tx.categoryId,
        name: tx.categoryId === UNCATEGORIZED_CATEGORY_ID ? "Uncategorized" : "Unknown Category",
        icon: "CircleHelp",
      };
      const account = accountsById.get(tx.accountId) ?? {
        id: tx.accountId, name: "Unknown Account", type: "checking" as const, balance: 0, currency: tx.currency || "CHF", icon: "Wallet",
      };
      const goal = tx.goalId ? goalsById.get(tx.goalId) : undefined;
      const counterpartyAccountId = counterpartyMap.get(tx.id);
      const destinationAccount = counterpartyAccountId
        ? (accountsById.get(counterpartyAccountId) ?? {
            id: counterpartyAccountId, name: "Unknown Account", type: "checking" as const, balance: 0, currency: tx.currency || "CHF", icon: "Wallet",
          })
        : undefined;

      return {
        ...tx,
        type: inferTransactionType(tx),
        category,
        account,
        destinationAccount,
        goal,
      } as TxDetails;
    });
  }, [rawTransactionsData, allCategories, accounts, goals]);

  // Filters (extracted to hook)
  const filters = useTransactionFilters({
    initialTypeFilter,
    initialCategoryFilterIds,
    initialTagFilterIds,
    initialSourceFilterIds,
    initialGoalFilterIds,
    initialAccountFilterIds,
  });

  const {
    searchQuery, setSearchQuery,
    typeFilter, setTypeFilter,
    categoryFilterIds, setCategoryFilterIds,
    tagFilterIds, setTagFilterIds,
    sourceFilterIds, setSourceFilterIds,
    showUncategorizedOnly, setShowUncategorizedOnly,
    sortField, sortDirection,
    showAdvancedFilters, setShowAdvancedFilters,
    goalFilterIds, setGoalFilterIds,
    accountFilterIds, setAccountFilterIds,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    amountMin, setAmountMin,
    amountMax, setAmountMax,
    advancedFilterCount, hasAnyFilter, clearAllFilters, toggleSort,
  } = filters;

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Popover state — at most one open at a time
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<TxDetails | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<SourceOption | null>(null);
  const [sourceToRename, setSourceToRename] = useState<SourceOption | null>(null);
  const [sourceRenameValue, setSourceRenameValue] = useState("");

  const editingTransaction = useMemo(() => {
    if (!editingTransactionId) {
      return null;
    }

    return transactions.find((transaction) => transaction.id === editingTransactionId) ?? null;
  }, [editingTransactionId, transactions]);

  const availableAccounts = accounts;

  const availableGoals = goals;

  const availableCategories = useMemo(
    () => allCategories.filter(c => !c.hidden && !c.isHidden),
    [allCategories],
  );

  const allCategoriesById = useMemo(
    () => new Map(allCategories.map(c => [c.id, c])),
    [allCategories],
  );

  const closePopovers = () => {
    setOpenActionId(null);
    setEditingCategoryId(null);
    setEditingGoalId(null);
    setEditingTagsId(null);
    setIsSourceMenuOpen(false);
  };

  const closeTransactionForm = () => {
    setIsTransactionFormOpen(false);
    setEditingTransactionId(null);
  };

  const openCreateTransactionForm = () => {
    if (availableCategories.length === 0) {
      toast.info('Add at least one visible category before creating a manual transaction.');
      navigate('/categories');
      return;
    }

    closePopovers();
    setEditingTransactionId(null);
    setIsTransactionFormOpen(true);
  };

  const openEditTransactionForm = (txId: string) => {
    closePopovers();
    setEditingTransactionId(txId);
    setIsTransactionFormOpen(true);
  };

  const toggleAction = (txId: string) => {
    setEditingCategoryId(null);
    setEditingGoalId(null);
    setEditingTagsId(null);
    setOpenActionId((prev) => (prev === txId ? null : txId));
  };

  const toggleEditCategory = (txId: string) => {
    setOpenActionId(null);
    setEditingGoalId(null);
    setEditingTagsId(null);
    setEditingCategoryId((prev) => (prev === txId ? null : txId));
  };

  const toggleEditGoal = (txId: string) => {
    setOpenActionId(null);
    setEditingCategoryId(null);
    setEditingTagsId(null);
    setEditingGoalId((prev) => (prev === txId ? null : txId));
  };

  const toggleEditTags = (txId: string) => {
    setOpenActionId(null);
    setEditingCategoryId(null);
    setEditingGoalId(null);
    setEditingTagsId((prev) => (prev === txId ? null : txId));
  };

  const handleAction = (
    txId: string,
    action: "edit" | "duplicate" | "delete",
  ) => {
    closePopovers();
    if (action === "delete") {
      const targetTransaction = transactions.find((transaction) => transaction.id === txId);
      if (targetTransaction) {
        setTransactionToDelete(targetTransaction);
      }
      return;
    }

    if (action === "edit") {
      openEditTransactionForm(txId);
      return;
    }

    if (action === "duplicate") {
      const tx = transactions.find((t) => t.id === txId);
      if (!tx) return;
      const { id, createdAt, updatedAt, type, category, account, destinationAccount, goal, ...txData } = tx;
      createTransactionMutation.mutate(txData, {
        onSuccess: () => toast.success("Transaction duplicated"),
        onError: () => toast.error("Failed to duplicate transaction"),
      });
    }
  };

  const handleConfirmDeleteTransaction = () => {
    if (!transactionToDelete) {
      return;
    }

    deleteTransactionMutation.mutate(transactionToDelete.id, {
      onSuccess: () => toast.success("Transaction deleted"),
      onError: () => toast.error("Failed to delete transaction"),
    });
    setTransactionToDelete(null);
  };

  const handleSubmitTransactionForm = (payload: TransactionFormSubmitPayload) => {
    if (editingTransactionId) {
      updateTransactionMutation.mutate(
        { id: editingTransactionId, ...payload },
        {
          onSuccess: () => {
            closeTransactionForm();
            toast.success("Transaction updated");
          },
          onError: () => toast.error("Failed to update transaction"),
        },
      );
    } else {
      createTransactionMutation.mutate(payload, {
        onSuccess: () => {
          closeTransactionForm();
          toast.success("Transaction added");
        },
        onError: () => toast.error("Failed to add transaction"),
      });
    }
  };

  const handleCategoryChange = (txId: string, categoryId: string) => {
    updateTransactionMutation.mutate(
      { id: txId, categoryId },
      {
        onError: () => toast.error("Failed to update category"),
      },
    );
    setEditingCategoryId(null);
  };

  const handleGoalChange = (txId: string, goalId: string | null) => {
    updateTransactionMutation.mutate(
      { id: txId, goalId: goalId ?? undefined },
      {
        onError: () => toast.error("Failed to update goal"),
      },
    );
    setEditingGoalId(null);
    setOpenActionId(null);
  };

  const handleTagsChange = (txId: string, nextTagIds: string[]) => {
    const availableTagIds = new Set(tags.map((tag) => tag.id));
    const normalizedTagIds = Array.from(
      new Set(
        nextTagIds
          .map((tagId) => tagId.trim())
          .filter((tagId) => tagId.length > 0 && availableTagIds.has(tagId)),
      ),
    );

    updateTransactionMutation.mutate(
      { id: txId, tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : [] },
      {
        onError: () => toast.error("Failed to update tags"),
      },
    );
  };

  const openQuickAutoRuleModal = (transaction: TxDetails) => {
    closePopovers();

    const fallbackCategoryId = availableCategories[0]?.id ?? '';

    const prefillCategoryId = transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
      ? fallbackCategoryId
      : transaction.categoryId;

    const keyword = transaction.description.trim();

    let prefillName = '';
    if (transaction.categoryId !== UNCATEGORIZED_CATEGORY_ID) {
      prefillName = transaction.goal
        ? `${transaction.category.name} → ${transaction.goal.name}`
        : transaction.category.name;
    }

    const prefillDraft: AutomationRulePrefillDraft = {
      name: prefillName,
      categoryId: prefillCategoryId,
      goalId: transaction.goalId,
      isEnabled: true,
      triggers: ['on-import', 'manual-run'],
      matchMode: 'all',
      applyToUncategorizedOnly: true,
      mergeIntoExistingCategoryRule: !transaction.goalId,
      conditions: [
        {
          field: 'description',
          operator: 'contains',
          value: keyword,
        },
      ],
    };

    navigate('/rules', {
      state: {
        prefillRuleDraft: prefillDraft,
      },
    });
  };

  // Computed stats from local state
  const pendingSplitTotal = useMemo(
    () =>
      transactions
        .filter((t) => t.split?.status === "pending")
        .reduce((sum, t) => sum + t.amount * (1 - t.split!.ratio), 0),
    [transactions],
  );

  const categoryOptions = availableCategories.map((category) => ({
    id: category.id,
    label: category.name,
  }));

  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag] as const)),
    [tags],
  );

  const tagOptions = useMemo(
    () =>
      [...tags]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((tag) => ({
          id: tag.id,
          label: tag.name,
        })),
    [tags],
  );

  const tagTransactionCountById = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((transaction) => {
      transaction.tagIds?.forEach((tagId) => {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      });
    });
    return counts;
  }, [transactions]);

  const goalOptions = useMemo(
    () => goals.map((g) => ({ id: g.id, label: g.name })),
    [goals],
  );

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ id: a.id, label: a.name })),
    [accounts],
  );

  // Import batches for source filtering (from API)

  const sourceOptions = useMemo<SourceOption[]>(() => {
    const sourceCounts = new Map<string, number>();
    let manualCount = 0;

    transactions.forEach((transaction) => {
      if (transaction.importBatchId) {
        sourceCounts.set(
          transaction.importBatchId,
          (sourceCounts.get(transaction.importBatchId) ?? 0) + 1,
        );
      } else {
        manualCount += 1;
      }
    });

    const options: SourceOption[] = [];

    if (manualCount > 0) {
      options.push({
        id: MANUAL_SOURCE_ID,
        label: "Manual entries",
        count: manualCount,
        deletable: false,
      });
    }

    importBatches.forEach((batch) => {
      const count = sourceCounts.get(batch.id) ?? 0;
      if (count > 0) {
        options.push({
          id: batch.id,
          label: batch.name || batch.fileName,
          count,
          deletable: true,
        });
      }
    });

    return options;
  }, [importBatches, transactions]);

  const availableSourceIds = useMemo(
    () => new Set(sourceOptions.map((option) => option.id)),
    [sourceOptions],
  );

  const activeSourceFilterIds = useMemo(
    () => sourceFilterIds.filter((id) => availableSourceIds.has(id)),
    [sourceFilterIds, availableSourceIds],
  );

  const sourceFilterLabel = useMemo(() => {
    if (activeSourceFilterIds.length === 0) return "Sources";
    if (activeSourceFilterIds.length === 1) {
      return sourceOptions.find((option) => option.id === activeSourceFilterIds[0])?.label
        ?? "1 source selected";
    }
    return `${activeSourceFilterIds.length} sources selected`;
  }, [activeSourceFilterIds, sourceOptions]);

  const toggleSourceFilter = (sourceId: string) => {
    setSourceFilterIds((prev) => {
      const normalized = prev.filter((id) => availableSourceIds.has(id));
      if (normalized.includes(sourceId)) {
        return normalized.filter((id) => id !== sourceId);
      }
      return [...normalized, sourceId];
    });
  };

  const requestDeleteSource = (sourceId: string) => {
    if (sourceId === MANUAL_SOURCE_ID) return;

    const source = sourceOptions.find((option) => option.id === sourceId);
    if (!source) return;

    setIsSourceMenuOpen(false);
    setSourceToDelete(source);
  };

  const requestRenameSource = (sourceId: string) => {
    if (sourceId === MANUAL_SOURCE_ID) return;

    const source = sourceOptions.find((option) => option.id === sourceId);
    if (!source || !source.deletable) return;

    setIsSourceMenuOpen(false);
    setSourceToRename(source);
    setSourceRenameValue(source.label);
  };

  const handleConfirmRenameSource = () => {
    if (!sourceToRename) {
      return;
    }

    updateImportBatchMutation.mutate(
      { id: sourceToRename.id, name: sourceRenameValue },
      {
        onSuccess: () => {
          toast.success(`Source renamed to "${sourceRenameValue}"`);
          setSourceToRename(null);
          setSourceRenameValue("");
        },
        onError: () => {
          toast.error("Failed to rename source");
          setSourceToRename(null);
          setSourceRenameValue("");
        },
      },
    );
  };

  const handleConfirmDeleteSource = () => {
    if (!sourceToDelete) return;

    const sourceId = sourceToDelete.id;
    if (sourceId === MANUAL_SOURCE_ID) {
      setSourceToDelete(null);
      return;
    }

    deleteImportBatchMutation.mutate(sourceId, {
      onSuccess: () => {
        setSourceFilterIds((prev) => prev.filter((id) => id !== sourceId));
        toast.success("Source deleted");
        setSourceToDelete(null);
      },
      onError: () => {
        toast.error("Failed to delete source");
        setSourceToDelete(null);
      },
    });
  };

  const handleCreateTag = async (draft: { name: string; color: string }): Promise<TransactionTag> => {
    const createdTag = await createTagMutation.mutateAsync(draft);
    toast.success(`Tag "${createdTag.name}" created`);
    return createdTag;
  };

  const handleUpdateTag = async (
    tagId: string,
    updates: { name: string; color: string },
  ): Promise<TransactionTag> => {
    const updatedTag = await updateTagMutation.mutateAsync({ id: tagId, ...updates });
    toast.success(`Tag "${updatedTag.name}" updated`);
    return updatedTag;
  };

  const handleDeleteTag = async (tagId: string): Promise<boolean> => {
    try {
      await deleteTagMutation.mutateAsync(tagId);
      setTagFilterIds((prev) => prev.filter((selectedTagId) => selectedTagId !== tagId));
      toast.success("Tag deleted");
      return true;
    } catch {
      toast.error("Failed to delete tag");
      return false;
    }
  };

  // Filtered scope before uncategorized toggle
  const scopedTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.category.name.toLowerCase().includes(query) ||
          t.goal?.name.toLowerCase().includes(query) ||
          (t.tagIds ?? []).some((tagId) => tagsById.get(tagId)?.name.toLowerCase().includes(query)),
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (categoryFilterIds.length > 0) {
      const selected = new Set(categoryFilterIds);
      result = result.filter((t) => selected.has(t.categoryId));
    }

    if (tagFilterIds.length > 0) {
      const selected = new Set(tagFilterIds);
      result = result.filter((transaction) =>
        transaction.tagIds?.some((tagId) => selected.has(tagId)),
      );
    }

    if (activeSourceFilterIds.length > 0) {
      const selectedSources = new Set(activeSourceFilterIds);
      result = result.filter((transaction) =>
        selectedSources.has(transaction.importBatchId ?? MANUAL_SOURCE_ID),
      );
    }

    if (goalFilterIds.length > 0) {
      const selected = new Set(goalFilterIds);
      result = result.filter((t) => t.goalId && selected.has(t.goalId));
    }

    if (accountFilterIds.length > 0) {
      const selected = new Set(accountFilterIds);
      result = result.filter((t) => selected.has(t.accountId));
    }

    if (dateFrom) {
      result = result.filter((t) => t.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((t) => t.date <= dateTo);
    }

    if (amountMin) {
      const min = parseFloat(amountMin);
      if (!Number.isNaN(min)) {
        result = result.filter((t) => Math.abs(t.amount) >= min);
      }
    }
    if (amountMax) {
      const max = parseFloat(amountMax);
      if (!Number.isNaN(max)) {
        result = result.filter((t) => Math.abs(t.amount) <= max);
      }
    }

    return result;
  }, [
    transactions,
    searchQuery,
    tagsById,
    typeFilter,
    categoryFilterIds,
    tagFilterIds,
    activeSourceFilterIds,
    goalFilterIds,
    accountFilterIds,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
  ]);

  const uncategorizedCount = useMemo(
    () =>
      scopedTransactions.filter(
        (transaction) => transaction.categoryId === UNCATEGORIZED_CATEGORY_ID,
      ).length,
    [scopedTransactions],
  );

  // Filtered and sorted
  const filteredTransactions = useMemo(() => {
    const result = showUncategorizedOnly
      ? scopedTransactions.filter(
          (transaction) => transaction.categoryId === UNCATEGORIZED_CATEGORY_ID,
        )
      : [...scopedTransactions];

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        const aWithTime = new Date(`${a.date}T${a.time ?? "00:00:00"}`).getTime();
        const bWithTime = new Date(`${b.date}T${b.time ?? "00:00:00"}`).getTime();
        const aTimestamp = Number.isNaN(aWithTime) ? new Date(a.date).getTime() : aWithTime;
        const bTimestamp = Number.isNaN(bWithTime) ? new Date(b.date).getTime() : bWithTime;
        comparison = aTimestamp - bTimestamp;
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [scopedTransactions, showUncategorizedOnly, sortField, sortDirection]);

  // Pagination (extracted to hook)
  const { page, setPage, pageSize, setPageSize, totalPages, pageSizes } =
    usePagination({ totalItems: filteredTransactions.length });

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [
    searchQuery,
    typeFilter,
    categoryFilterIds,
    tagFilterIds,
    sourceFilterIds,
    goalFilterIds,
    accountFilterIds,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    showUncategorizedOnly,
    sortField,
    sortDirection,
    setPage,
  ]);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalTransfers = filteredTransactions
    .filter((t) => t.type === "transfer")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Paginate the filtered results
  const paginatedTransactions = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, page, pageSize]);

  const handleExportJson = () => {
    if (filteredTransactions.length === 0) {
      return;
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
        filters: {
          searchQuery,
          type: typeFilter,
          categoryIds: categoryFilterIds,
          tagIds: tagFilterIds,
          sourceIds: activeSourceFilterIds,
          goalIds: goalFilterIds,
          accountIds: accountFilterIds,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          amountMin: amountMin || undefined,
          amountMax: amountMax || undefined,
          uncategorizedOnly: showUncategorizedOnly,
          sortField,
          sortDirection,
        },
      transactionCount: filteredTransactions.length,
      transactions: filteredTransactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.date,
        time: transaction.time ?? null,
        description: transaction.description,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        categoryId: transaction.categoryId,
        categoryName: transaction.category.name,
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        destinationAccountName: transaction.destinationAccount?.name ?? null,
        transferPairId: transaction.transferPairId ?? null,
        transferPairRole: transaction.transferPairRole ?? null,
        goalId: transaction.goalId ?? null,
        goalName: transaction.goal?.name ?? null,
        tagIds: transaction.tagIds ?? [],
        tagNames: (transaction.tagIds ?? [])
          .map((tagId) => tagsById.get(tagId)?.name)
          .filter((tagName): tagName is string => Boolean(tagName)),
        importBatchId: transaction.importBatchId ?? null,
        split: transaction.split ?? null,
        metadata: transaction.metadata ?? null,
        rawData: transaction.rawData ?? null,
      })),
    };

    const fileDate = new Date().toISOString().split("T")[0];
    const fileName = `saveslate-transactions-filtered-${fileDate}.json`;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      {/* Backdrop — closes any open popover on click */}
      {(openActionId || editingCategoryId || editingGoalId || editingTagsId) && (
        <div className="fixed inset-0 z-10" onClick={closePopovers} />
      )}

      {transactionToDelete && (
        <DeleteConfirmationModal
          title="Delete transaction?"
          description={(
            <>
              This will permanently delete <span className="text-foreground">{transactionToDelete.description}</span> ({formatSignedCurrency(transactionToDelete.amount, transactionToDelete.currency)}).
            </>
          )}
          confirmLabel="Delete transaction"
          onConfirm={handleConfirmDeleteTransaction}
          onClose={() => setTransactionToDelete(null)}
        />
      )}

      {sourceToDelete && (
        <DeleteConfirmationModal
          title="Delete source?"
          description={(
            <>
              This will permanently delete <span className="text-foreground">{sourceToDelete.label}</span> and <span className="text-expense">{sourceToDelete.count} transaction{sourceToDelete.count === 1 ? "" : "s"}</span>.
            </>
          )}
          confirmLabel="Delete source"
          onConfirm={handleConfirmDeleteSource}
          onClose={() => setSourceToDelete(null)}
        />
      )}

      {sourceToRename && (
        <Dialog open onOpenChange={(open) => {
          if (!open) {
            setSourceToRename(null);
            setSourceRenameValue("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rename source</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rename-source-input">
                Source name
              </Label>
              <Input
                id="rename-source-input"
                type="text"
                value={sourceRenameValue}
                onChange={(event) => setSourceRenameValue(event.target.value)}
                placeholder="Source name"
                autoFocus
              />
            </div>
            <p className="text-sm text-dimmed">
              Leave empty to use the original file name.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSourceToRename(null);
                  setSourceRenameValue("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmRenameSource}
              >
                Save name
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isTransactionFormOpen && (
        <TransactionFormModal
          mode={editingTransaction ? "edit" : "create"}
          transaction={editingTransaction}
          accounts={availableAccounts}
          categories={availableCategories}
          allCategories={allCategories}
          goals={availableGoals}
          tags={tags}
          onCancel={closeTransactionForm}
          onSubmit={handleSubmitTransactionForm}
        />
      )}

      {/* Header */}
      <PageHeader title="Transactions">
        <PageHeaderActions
          onImport={() => navigate("/import")}
          onExport={handleExportJson}
          onCreate={openCreateTransactionForm}
          exportDisabled={filteredTransactions.length === 0}
        />
      </PageHeader>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-8 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {filteredTransactions.length}
            </span>
            <span className="text-sm text-dimmed">Transactions</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-income" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              +{formatCurrency(totalIncome)}
            </span>
            <span className="text-sm text-dimmed">Income</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              -{formatCurrency(totalExpenses)}
            </span>
            <span className="text-sm text-dimmed">Expenses</span>
          </div>
        </div>
        {totalTransfers > 0 && (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-transfer" />
            <div className="flex flex-col gap-0.5">
              <span
                className="text-base font-medium text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {formatCurrency(totalTransfers)}
              </span>
              <span className="text-sm text-dimmed">Transfers</span>
            </div>
          </div>
        )}
        {pendingSplitTotal > 0 && (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-split" />
            <div className="flex flex-col gap-0.5">
              <span
                className="text-base font-medium text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {formatCurrency(pendingSplitTotal)}
              </span>
              <span className="text-sm text-dimmed">Pending Splits</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Row 1: Search (full width) */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dimmed" />
          <Input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Row 2: 5 multi-select dropdowns + Filters toggle */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Category multi-select */}
          <MultiSelectDropdown
            options={categoryOptions}
            selectedIds={categoryFilterIds}
            onChange={setCategoryFilterIds}
            allLabel="Categories"
            icon={<Tag size={14} />}
            className="w-full lg:flex-1 lg:min-w-0"
          />

          {/* Tag multi-select */}
          <MultiSelectDropdown
            options={tagOptions}
            selectedIds={tagFilterIds}
            onChange={setTagFilterIds}
            allLabel="Tags"
            icon={<Tags size={14} />}
            className="w-full lg:flex-1 lg:min-w-0"
          />

          {/* Goal multi-select */}
          <MultiSelectDropdown
            options={goalOptions}
            selectedIds={goalFilterIds}
            onChange={setGoalFilterIds}
            allLabel="Goals"
            icon={<Target size={14} />}
            className="w-full lg:flex-1 lg:min-w-0"
          />

          {/* Account multi-select */}
          <MultiSelectDropdown
            options={accountOptions}
            selectedIds={accountFilterIds}
            onChange={setAccountFilterIds}
            allLabel="Accounts"
            icon={<Wallet size={14} />}
            className="w-full lg:flex-1 lg:min-w-0"
          />

          {/* Source filter dropdown */}
          <Popover
            open={isSourceMenuOpen}
            onOpenChange={(open) => {
              if (open) {
                setOpenActionId(null);
                setEditingCategoryId(null);
                setEditingGoalId(null);
                setEditingTagsId(null);
              }
              setIsSourceMenuOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-left text-sm text-foreground transition-colors cursor-pointer",
                  activeSourceFilterIds.length > 0 && "border-primary/40",
                  "w-full lg:flex-1 lg:min-w-0",
                )}
              >
                <span className={cn("shrink-0", activeSourceFilterIds.length > 0 ? "text-primary" : "text-dimmed")}>
                  <Upload size={14} />
                </span>
                <span className="flex-1 truncate">{sourceFilterLabel}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "shrink-0 transition-transform duration-150",
                    isSourceMenuOpen && "rotate-180",
                  )}
                />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-1"
            >
              {/* All option */}
              <label
                className={cn(
                  "flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer transition-colors",
                  activeSourceFilterIds.length === 0
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <Checkbox
                  checked={activeSourceFilterIds.length === 0}
                  onCheckedChange={() => setSourceFilterIds([])}
                />
                <span className="text-sm text-muted-foreground flex-1 truncate">Sources</span>
              </label>

              <Separator className="mx-1 my-1 w-auto" />

              <ScrollArea className="max-h-64">
                {sourceOptions.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-dimmed">No sources available</div>
                ) : (
                  sourceOptions.map((source) => {
                    const isSelected = activeSourceFilterIds.includes(source.id);
                    return (
                      <div key={source.id} className="group flex items-center gap-1">
                        <label
                          className={cn(
                            "flex items-center gap-2 flex-1 px-2 py-2 rounded-sm cursor-pointer transition-colors",
                            isSelected
                              ? "bg-foreground/10 text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSourceFilter(source.id)}
                          />
                          <span className="text-sm text-muted-foreground flex-1 truncate">{source.label}</span>
                          <span className="text-sm text-dimmed">{source.count}</span>
                        </label>

                        {source.deletable && (
                          <>
                            <button
                              type="button"
                              onClick={() => requestRenameSource(source.id)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-dimmed hover:text-foreground transition-colors opacity-60 hover:opacity-100"
                              title={`Rename source ${source.label}`}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteSource(source.id)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-dimmed hover:text-expense transition-colors opacity-60 hover:opacity-100"
                              title={`Delete source ${source.label}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Advanced filters toggle */}
          <Button
            variant="ghost"
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={cn(
              "flex items-center gap-2 shrink-0",
              showAdvancedFilters && "text-primary",
            )}
          >
            <SlidersHorizontal size={16} />
            <span className="text-sm text-muted-foreground font-medium">Filters</span>
            {advancedFilterCount > 0 && (
              <Badge>{advancedFilterCount}</Badge>
            )}
          </Button>
        </div>

        {/* Advanced filters panel (date range + amount range only) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-card border border-border rounded-(--radius-md)">
            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-dimmed">From date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-dimmed">To date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Amount min */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-dimmed">Min amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            {/* Amount max */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-dimmed">Max amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}

        {/* Row 3: Type filter pills + active filter badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_LABELS.map((t) => {
            const isActive = typeFilter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => {
                  setTypeFilter(t.value);
                  setCategoryFilterIds([]);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border cursor-pointer",
                  isActive
                    ? t.value === "all"
                      ? "bg-foreground/10 text-foreground border-foreground/20"
                      : activeTypePillStyles[t.value]
                    : "bg-card text-muted-foreground border-border opacity-60 hover:opacity-100",
                )}
              >
                {t.label}
              </button>
            );
          })}

          {/* Active filter badges */}
          {categoryFilterIds.length > 0 && (
            <button
              type="button"
              onClick={() => setCategoryFilterIds([])}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {categoryFilterIds.length === 1
                ? (allCategoriesById.get(categoryFilterIds[0])?.name ?? "1 category")
                : `${categoryFilterIds.length} categories`}
              <X size={12} />
            </button>
          )}
          {tagFilterIds.length > 0 && (
            <button
              type="button"
              onClick={() => setTagFilterIds([])}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {tagFilterIds.length === 1
                ? (tagOptions.find((tagOption) => tagOption.id === tagFilterIds[0])?.label ?? "1 tag")
                : `${tagFilterIds.length} tags`}
              <X size={12} />
            </button>
          )}
          {goalFilterIds.length > 0 && (
            <button
              type="button"
              onClick={() => setGoalFilterIds([])}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {goalFilterIds.length === 1
                ? (goalOptions.find((g) => g.id === goalFilterIds[0])?.label ?? "1 goal")
                : `${goalFilterIds.length} goals`}
              <X size={12} />
            </button>
          )}
          {accountFilterIds.length > 0 && (
            <button
              type="button"
              onClick={() => setAccountFilterIds([])}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {accountFilterIds.length === 1
                ? (accountOptions.find((a) => a.id === accountFilterIds[0])?.label ?? "1 account")
                : `${accountFilterIds.length} accounts`}
              <X size={12} />
            </button>
          )}
          {activeSourceFilterIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSourceFilterIds([])}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {activeSourceFilterIds.length === 1
                ? (sourceOptions.find((s) => s.id === activeSourceFilterIds[0])?.label ?? "1 source")
                : `${activeSourceFilterIds.length} sources`}
              <X size={12} />
            </button>
          )}
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : dateFrom ? `From ${dateFrom}` : `To ${dateTo}`}
              <X size={12} />
            </button>
          )}
          {(amountMin || amountMax) && (
            <button
              type="button"
              onClick={() => { setAmountMin(""); setAmountMax(""); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {amountMin && amountMax ? `${amountMin} - ${amountMax}` : amountMin ? `Min ${amountMin}` : `Max ${amountMax}`}
              <X size={12} />
            </button>
          )}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-dimmed hover:text-foreground cursor-pointer bg-transparent border-none px-1 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {(uncategorizedCount > 0 || showUncategorizedOnly) && (
        <div className="flex items-center px-1 mt-3">
          <button
            type="button"
            onClick={() => setShowUncategorizedOnly((prev) => !prev)}
            className={cn(
              "flex items-center gap-2 bg-transparent border-none cursor-pointer transition-opacity px-0 py-0",
              showUncategorizedOnly ? "opacity-100" : "opacity-60 hover:opacity-100",
            )}
          >
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-sm text-warning font-medium hover:underline">
              {uncategorizedCount} uncategorized transaction
              {uncategorizedCount === 1 ? "" : "s"}
              {showUncategorizedOnly ? " (filtered)" : ""}
            </span>
            <Filter size={12} className="text-warning" />
          </button>
        </div>
      )}

      {/* Table Header */}
      <div className="hidden lg:flex items-center gap-4 px-1 text-sm text-dimmed uppercase tracking-wider">
        <div className="w-[34px]" />
        <div className="flex-1">Description</div>
        <button
          onClick={() => toggleSort("date")}
          className="flex items-center gap-1 w-24 bg-transparent border-none text-dimmed hover:text-foreground cursor-pointer transition-colors text-sm uppercase tracking-wider"
        >
          Date
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <button
          onClick={() => toggleSort("amount")}
          className="flex items-center gap-1 w-28 justify-end bg-transparent border-none text-dimmed hover:text-foreground cursor-pointer transition-colors text-sm uppercase tracking-wider"
        >
          Amount
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <div className="w-8" />
      </div>

      {/* Transaction Rows */}
      <div className="flex flex-col">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center">
            {transactions.length === 0 ? (
              <p className="text-base text-dimmed">
                No transactions yet. Import transactions or create a new one manually.
              </p>
            ) : (
              <p className="text-base text-dimmed">
                No transactions found. Try adjusting your filters.
              </p>
            )}
          </div>
        ) : (
          paginatedTransactions.map((tx, index) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              openCategoryUpward={index >= Math.max(0, paginatedTransactions.length - 3)}
              isActionOpen={openActionId === tx.id}
              isEditingCategory={editingCategoryId === tx.id}
              isEditingGoal={editingGoalId === tx.id}
              isEditingTags={editingTagsId === tx.id}
              availableTags={tags}
              availableTagsById={tagsById}
              tagUsageCountById={tagTransactionCountById}
              onToggleAction={() => toggleAction(tx.id)}
              onToggleEditCategory={() => toggleEditCategory(tx.id)}
              onToggleEditGoal={() => toggleEditGoal(tx.id)}
              onToggleEditTags={() => toggleEditTags(tx.id)}
              onCategoryChange={(catId) => handleCategoryChange(tx.id, catId)}
              onGoalChange={(goalId) => handleGoalChange(tx.id, goalId)}
              onTagsChange={(tagIds) => handleTagsChange(tx.id, tagIds)}
              onCreateTag={handleCreateTag}
              onUpdateTag={handleUpdateTag}
              onDeleteTag={handleDeleteTag}
              onCreateRule={() => openQuickAutoRuleModal(tx)}
              onAction={(action) => handleAction(tx.id, action)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredTransactions.length > pageSizes[0] && (
        <div className="flex items-center justify-between px-1 py-3 text-sm text-dimmed border-t border-border mt-2">
          <div className="flex items-center gap-1.5">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="text-sm bg-transparent border border-border rounded px-1 py-0.5 text-muted-foreground cursor-pointer"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredTransactions.length)} of {filteredTransactions.length}
          </span>
          <PaginationButtons page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
