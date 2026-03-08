import { useState, useMemo, useEffect } from "react";
import {
  Search,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  Target,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Users,
  ChevronDown,
  X,
  SlidersHorizontal,
  Tag,
  Tags,
  Wallet,
  Upload,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, PageHeaderActions } from "../components/layout";
import {
  TransactionFormModal,
  type TransactionFormSubmitPayload,
} from "../components/transactions";
import {
  Badge,
  CategoryPicker,
  DeleteConfirmationModal,
  GoalPicker,
  Icon,
  Modal,
  MultiSelectDropdown,
  PaginationButtons,
  TagPicker,
} from "../components/ui";
import {
  getAccountById,
  getAccounts,
  getCategoryById,
  getGoalById,
  getGoals,
  CATEGORIES,
} from "../lib/data-service";
import {
  deleteImportBatch,
  loadImportBatches,
  loadTransactions,
  pruneEmptyImportBatches,
  renameImportBatch,
  saveTransactions,
} from "../lib/transaction-storage";
import {
  addTag,
  deleteTag,
  loadTags,
  updateTag,
} from "../lib/tag-storage";
import {
  inferTransactionType,
  UNCATEGORIZED_CATEGORY_ID,
} from "../lib/transaction-type";
import {
  formatDate,
  resolveTransferFlowAccounts,
  cn,
} from "../lib/utils";
import { useFormatCurrency } from "../hooks";
import type {
  ImportBatch,
  AutomationRulePrefillDraft,
  Tag as TransactionTag,
  Transaction,
  TransactionType,
  TransactionWithDetails as TxDetails,
} from "../types";

type SortField = "date" | "amount";
type SortDirection = "asc" | "desc";

const PAGE_SIZES = [20, 50, 100] as const;

const TYPE_LABELS: { value: TransactionType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

const amountColors: Record<TransactionType, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-text",
};

function getAmountColorClass(type: TransactionType, amount: number): string {
  if (type !== "transfer") {
    return amountColors[type];
  }
  if (amount > 0) {
    return "text-income";
  }
  if (amount < 0) {
    return "text-expense";
  }
  return "text-text";
}

const iconBoxStyles: Record<TransactionType, string> = {
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  transfer: "bg-transfer/10 text-transfer",
};

const UNCATEGORIZED_ICON_STYLE = "bg-warning/10 text-warning";

const activeTypePillStyles: Record<TransactionType, string> = {
  income: "bg-income/10 text-income border-income/20",
  expense: "bg-expense/10 text-expense border-expense/20",
  transfer: "bg-transfer/10 text-transfer border-transfer/20",
};

const MANUAL_SOURCE_ID = "manual";

function parseFilterIdsFromQuery(searchParams: URLSearchParams, key: string): string[] {
  const values = searchParams
    .getAll(key)
    .flatMap((rawValue) => rawValue.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(values));
}

function parseTypeFilterFromQuery(searchParams: URLSearchParams): TransactionType | "all" {
  const rawType = searchParams.get("type");
  if (rawType === "income" || rawType === "expense" || rawType === "transfer") {
    return rawType;
  }

  return "all";
}

interface SourceOption {
  id: string;
  label: string;
  count: number;
  deletable: boolean;
}

function createTransferCounterpartyMap(transactions: Transaction[]): Map<string, string> {
  const transactionsByPairId = new Map<string, Transaction[]>();

  transactions.forEach((transaction) => {
    if (!transaction.transferPairId) {
      return;
    }

    const pairTransactions = transactionsByPairId.get(transaction.transferPairId) ?? [];
    pairTransactions.push(transaction);
    transactionsByPairId.set(transaction.transferPairId, pairTransactions);
  });

  const counterpartyByTransactionId = new Map<string, string>();
  for (const [, pairTransactions] of transactionsByPairId) {
    if (pairTransactions.length !== 2) {
      continue;
    }

    const [left, right] = pairTransactions;
    counterpartyByTransactionId.set(left.id, right.accountId);
    counterpartyByTransactionId.set(right.id, left.accountId);
  }

  return counterpartyByTransactionId;
}

function toTransactionWithDetails(
  transaction: Transaction,
  counterpartyByTransactionId: Map<string, string>,
): TxDetails {
  const category = getCategoryById(transaction.categoryId) ?? {
    id: transaction.categoryId,
    name:
      transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
        ? "Uncategorized"
        : "Unknown Category",
    icon: "CircleHelp",
  };

  const account = getAccountById(transaction.accountId) ?? {
    id: transaction.accountId,
    name: "Unknown Account",
    type: "checking",
    balance: 0,
    currency: transaction.currency || "CHF",
    icon: "Wallet",
  };

  const goal = transaction.goalId ? getGoalById(transaction.goalId) : undefined;

  const counterpartyAccountId = counterpartyByTransactionId.get(transaction.id);

  const destinationAccount = counterpartyAccountId
    ? (getAccountById(counterpartyAccountId) ?? {
        id: counterpartyAccountId,
        name: "Unknown Account",
        type: "checking" as const,
        balance: 0,
        currency: transaction.currency || "CHF",
        icon: "Wallet",
      })
    : undefined;

  return {
    ...transaction,
    type: inferTransactionType(transaction),
    category,
    account,
    destinationAccount,
    goal,
  };
}

function loadTransactionsWithDetails(): TxDetails[] {
  const transactions = loadTransactions();
  const counterpartyByTransactionId = createTransferCounterpartyMap(transactions);
  return transactions.map((transaction) => toTransactionWithDetails(transaction, counterpartyByTransactionId));
}

function toStoredTransaction(transaction: TxDetails): Transaction {
  return {
    id: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    categoryId: transaction.categoryId,
    description: transaction.description,
    date: transaction.date,
    accountId: transaction.accountId,
    ...(transaction.transactionId !== undefined && { transactionId: transaction.transactionId }),
    ...(transaction.time !== undefined && { time: transaction.time }),
    ...(transaction.transferPairId !== undefined && { transferPairId: transaction.transferPairId }),
    ...(transaction.transferPairRole !== undefined && { transferPairRole: transaction.transferPairRole }),
    ...(transaction.goalId !== undefined && { goalId: transaction.goalId }),
    ...(transaction.importBatchId !== undefined && { importBatchId: transaction.importBatchId }),
    ...(transaction.split !== undefined && { split: transaction.split }),
    ...(transaction.tagIds !== undefined && { tagIds: transaction.tagIds }),
    ...(transaction.metadata !== undefined && { metadata: transaction.metadata }),
    ...(transaction.rawData !== undefined && { rawData: transaction.rawData }),
  };
}

function persistTransactions(transactions: TxDetails[]): TxDetails[] {
  saveTransactions(transactions.map((transaction) => toStoredTransaction(transaction)));
  return loadTransactionsWithDetails();
}

export function Transactions() {
  const { formatCurrency, formatSignedCurrency } = useFormatCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTypeFilter = parseTypeFilterFromQuery(searchParams);
  const initialCategoryFilterIds = parseFilterIdsFromQuery(searchParams, "category");
  const initialSourceFilterIds = parseFilterIdsFromQuery(searchParams, "source");
  const initialGoalFilterIds = parseFilterIdsFromQuery(searchParams, "goal");
  const initialAccountFilterIds = parseFilterIdsFromQuery(searchParams, "account");
  const initialTagFilterIds = parseFilterIdsFromQuery(searchParams, "tag");

  // Mutable local state so inline actions (delete, duplicate) work
  const [transactions, setTransactions] = useState(() =>
    loadTransactionsWithDetails(),
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">(initialTypeFilter);
  const [categoryFilterIds, setCategoryFilterIds] = useState<string[]>(initialCategoryFilterIds);
  const [tagFilterIds, setTagFilterIds] = useState<string[]>(initialTagFilterIds);
  const [sourceFilterIds, setSourceFilterIds] = useState<string[]>(initialSourceFilterIds);
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [goalFilterIds, setGoalFilterIds] = useState<string[]>(initialGoalFilterIds);
  const [accountFilterIds, setAccountFilterIds] = useState<string[]>(initialAccountFilterIds);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Tags state
  const [tags, setTags] = useState<TransactionTag[]>(() => loadTags());
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

  const availableAccounts = useMemo(
    () => getAccounts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions],
  );

  const availableGoals = useMemo(
    () => getGoals(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions],
  );

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
  ]);

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
      setTransactions((prev) => {
        const tx = prev.find((t) => t.id === txId);
        if (!tx) return prev;
        const dup = { ...tx, id: `${tx.id}-dup-${Date.now()}` };
        const idx = prev.findIndex((t) => t.id === txId);
        const next = [...prev];
        next.splice(idx + 1, 0, dup);
        return persistTransactions(next);
      });
    }
  };

  const handleConfirmDeleteTransaction = () => {
    if (!transactionToDelete) {
      return;
    }

    setTransactions((prev) => {
      const nextTransactions = prev.filter((tx) => tx.id !== transactionToDelete.id);
      return persistTransactions(nextTransactions);
    });
    setTransactionToDelete(null);
  };

  const handleSubmitTransactionForm = (payload: TransactionFormSubmitPayload) => {
    const storedTransactions = loadTransactions();

    if (editingTransactionId) {
      const targetIndex = storedTransactions.findIndex(
        (transaction) => transaction.id === editingTransactionId,
      );

      if (targetIndex === -1) {
        closeTransactionForm();
        setTransactions(loadTransactionsWithDetails());
        return;
      }

      const currentTransaction = storedTransactions[targetIndex];
      storedTransactions[targetIndex] = {
        ...currentTransaction,
        ...payload,
        transactionId: payload.transactionId,
        time: payload.time,
        goalId: payload.goalId,
        split: payload.split,
        tagIds: payload.tagIds,
      };
    } else {
      storedTransactions.push({
        id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...payload,
      });
    }

    saveTransactions(storedTransactions);
    setTransactions(loadTransactionsWithDetails());
    setTags(loadTags());
    closeTransactionForm();
  };

  const handleCategoryChange = (txId: string, categoryId: string) => {
    const category = getCategoryById(categoryId);
    if (!category) return;
    setTransactions((prev) => {
      const nextTransactions = prev.map((tx) => {
        if (tx.id !== txId) return tx;

        return {
          ...tx,
          categoryId,
          category,
          type: inferTransactionType(tx),
        };
      });

      return persistTransactions(nextTransactions);
    });

    setEditingCategoryId(null);
  };

  const handleGoalChange = (txId: string, goalId: string | null) => {
    const goal = goalId ? getGoalById(goalId) : undefined;
    if (goalId && !goal) {
      return;
    }

    setTransactions((prev) => {
      const nextTransactions = prev.map((tx) => {
        if (tx.id !== txId) return tx;

        return {
          ...tx,
          goalId: goalId ?? undefined,
          goal,
        };
      });

      return persistTransactions(nextTransactions);
    });

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

    setTransactions((prev) => {
      const nextTransactions = prev.map((tx) => {
        if (tx.id !== txId) {
          return tx;
        }

        return {
          ...tx,
          tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
        };
      });

      return persistTransactions(nextTransactions);
    });
  };

  const openQuickAutoRuleModal = (transaction: TxDetails) => {
    closePopovers();

    const fallbackCategoryId = CATEGORIES[0]?.id ?? UNCATEGORIZED_CATEGORY_ID;

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

  // Categories available for filtering — show all categories regardless of type filter
  const availableCategories = useMemo(() => {
    return CATEGORIES;
  }, []);

  const categoryOptions = useMemo(
    () =>
      availableCategories.map((c) => ({
        id: c.id,
        label: c.name,
      })),
    [availableCategories],
  );

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
    () => getGoals().map((g) => ({ id: g.id, label: g.name })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions],
  );

  const accountOptions = useMemo(
    () => getAccounts().map((a) => ({ id: a.id, label: a.name })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions],
  );

  // Import batches for source filtering
  const [importBatches, setImportBatches] = useState<ImportBatch[]>(() => {
    pruneEmptyImportBatches();
    return loadImportBatches();
  });

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

    const renamedBatch = renameImportBatch(sourceToRename.id, sourceRenameValue);
    if (!renamedBatch) {
      setSourceToRename(null);
      setSourceRenameValue("");
      return;
    }

    setImportBatches((prev) =>
      prev.map((batch) => (batch.id === renamedBatch.id ? renamedBatch : batch)),
    );
    setSourceToRename(null);
    setSourceRenameValue("");
  };

  const handleConfirmDeleteSource = () => {
    if (!sourceToDelete) return;

    const sourceId = sourceToDelete.id;
    if (sourceId === MANUAL_SOURCE_ID) {
      setSourceToDelete(null);
      return;
    }

    deleteImportBatch(sourceId);

    setImportBatches((prev) => prev.filter((batch) => batch.id !== sourceId));
    setSourceFilterIds((prev) => prev.filter((id) => id !== sourceId));
    setTransactions(loadTransactionsWithDetails());
    setSourceToDelete(null);
  };

  const handleCreateTag = (draft: { name: string; color: string }): TransactionTag => {
    const createdTag = addTag(draft);
    setTags(loadTags());
    return createdTag;
  };

  const handleUpdateTag = (
    tagId: string,
    updates: { name: string; color: string },
  ): TransactionTag => {
    const updatedTag = updateTag(tagId, updates);
    if (!updatedTag) {
      throw new Error("Tag not found.");
    }

    setTags(loadTags());
    return updatedTag;
  };

  const handleDeleteTag = (tagId: string): boolean => {
    const deleteResult = deleteTag(tagId);
    if (!deleteResult.deleted) {
      return false;
    }

    setTags(loadTags());
    setTagFilterIds((prev) => prev.filter((selectedTagId) => selectedTagId !== tagId));

    if (deleteResult.unlinkedTransactions > 0) {
      setTransactions(loadTransactionsWithDetails());
    }

    return true;
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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const advancedFilterCount =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (amountMin ? 1 : 0) +
    (amountMax ? 1 : 0);

  const hasAnyFilter =
    categoryFilterIds.length > 0 ||
    tagFilterIds.length > 0 ||
    activeSourceFilterIds.length > 0 ||
    goalFilterIds.length > 0 ||
    accountFilterIds.length > 0 ||
    typeFilter !== "all" ||
    searchQuery !== "" ||
    advancedFilterCount > 0;

  const clearAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setCategoryFilterIds([]);
    setTagFilterIds([]);
    setSourceFilterIds([]);
    setGoalFilterIds([]);
    setAccountFilterIds([]);
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setShowUncategorizedOnly(false);
  };

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
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
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
    <div className="page-container">
      {/* Backdrop — closes any open popover on click */}
      {(openActionId || editingCategoryId || editingGoalId || editingTagsId) && (
        <div className="fixed inset-0 z-10" onClick={closePopovers} />
      )}

      {transactionToDelete && (
        <DeleteConfirmationModal
          title="Delete transaction?"
          description={(
            <>
              This will permanently delete <span className="text-text">{transactionToDelete.description}</span> ({formatSignedCurrency(transactionToDelete.amount, transactionToDelete.currency)}).
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
              This will permanently delete <span className="text-text">{sourceToDelete.label}</span> and <span className="text-expense">{sourceToDelete.count} transaction{sourceToDelete.count === 1 ? "" : "s"}</span>.
            </>
          )}
          confirmLabel="Delete source"
          onConfirm={handleConfirmDeleteSource}
          onClose={() => setSourceToDelete(null)}
        />
      )}

      {sourceToRename && (
        <Modal
          onClose={() => {
            setSourceToRename(null);
            setSourceRenameValue("");
          }}
          panelClassName="max-w-md p-5 space-y-4"
        >
          <div>
              <h2 className="heading-2">Rename source</h2>
              <div className="space-y-2">
                <label className="label" htmlFor="rename-source-input">
                  Source name
                </label>
                <input
                  id="rename-source-input"
                  type="text"
                  value={sourceRenameValue}
                  onChange={(event) => setSourceRenameValue(event.target.value)}
                  className="input"
                  placeholder="Source name"
                  autoFocus
                />
              </div>
              <p className="text-ui text-text-muted">
                Leave empty to use the original file name.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSourceToRename(null);
                    setSourceRenameValue("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRenameSource}
                  className="btn-primary"
                >
                  Save name
                </button>
              </div>
          </div>
        </Modal>
      )}

      {isTransactionFormOpen && (
        <TransactionFormModal
          mode={editingTransaction ? "edit" : "create"}
          transaction={editingTransaction}
          accounts={availableAccounts}
          categories={CATEGORIES}
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
          <div className="w-2 h-2 rounded-full bg-text-secondary" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {filteredTransactions.length}
            </span>
            <span className="text-ui text-text-muted">Transactions</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-income" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              +{formatCurrency(totalIncome)}
            </span>
            <span className="text-ui text-text-muted">Income</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              -{formatCurrency(totalExpenses)}
            </span>
            <span className="text-ui text-text-muted">Expenses</span>
          </div>
        </div>
        {totalTransfers > 0 && (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-transfer" />
            <div className="flex flex-col gap-0.5">
              <span
                className="text-base font-medium text-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {formatCurrency(totalTransfers)}
              </span>
              <span className="text-ui text-text-muted">Transfers</span>
            </div>
          </div>
        )}
        {pendingSplitTotal > 0 && (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-split" />
            <div className="flex flex-col gap-0.5">
              <span
                className="text-base font-medium text-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {formatCurrency(pendingSplitTotal)}
              </span>
              <span className="text-ui text-text-muted">Pending Splits</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Row 1: Search (full width) */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
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

          {/* Source filter dropdown (custom — has rename/delete actions) */}
          <div className="relative w-full lg:flex-1 lg:min-w-0">
            <button
              type="button"
              onClick={() => {
                setOpenActionId(null);
                setEditingCategoryId(null);
                setEditingGoalId(null);
                setEditingTagsId(null);
                setIsSourceMenuOpen((prev) => !prev);
              }}
              className={cn(
                "select flex items-center gap-2 text-left w-full pr-3",
                activeSourceFilterIds.length > 0 && "border-accent/40",
              )}
            >
              <span className={cn("shrink-0", activeSourceFilterIds.length > 0 ? "text-accent" : "text-text-muted")}>
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

            {isSourceMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsSourceMenuOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-full min-w-[280px] bg-surface border border-border rounded-(--radius-md) p-1 z-20 shadow-(--shadow-md)">
                  <label
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 rounded-(--radius-sm) cursor-pointer transition-colors",
                      activeSourceFilterIds.length === 0
                        ? "bg-text/10 text-text"
                        : "text-text-secondary hover:text-text hover:bg-surface-hover",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={activeSourceFilterIds.length === 0}
                      onChange={() => setSourceFilterIds([])}
                      className="cursor-pointer accent-text"
                    />
                    <span className="text-ui flex-1 truncate">Sources</span>
                  </label>

                  <div className="h-px bg-border mx-1 my-1" />

                  <div className="max-h-64 overflow-y-auto">
                    {sourceOptions.length === 0 ? (
                      <div className="px-2 py-2 text-ui text-text-muted">No sources available</div>
                    ) : (
                      sourceOptions.map((source) => {
                        const isSelected = activeSourceFilterIds.includes(source.id);
                        return (
                          <div key={source.id} className="group flex items-center gap-1">
                            <label
                              className={cn(
                                "flex items-center gap-2 flex-1 px-2 py-2 rounded-(--radius-sm) cursor-pointer transition-colors",
                                isSelected
                                  ? "bg-text/10 text-text"
                                  : "text-text-secondary hover:text-text hover:bg-surface-hover",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSourceFilter(source.id)}
                                className="cursor-pointer accent-text"
                              />
                              <span className="text-ui flex-1 truncate">{source.label}</span>
                              <span className="text-ui text-text-muted">{source.count}</span>
                            </label>

                            {source.deletable && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => requestRenameSource(source.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-colors opacity-60 hover:opacity-100"
                                  title={`Rename source ${source.label}`}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestDeleteSource(source.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-expense transition-colors opacity-60 hover:opacity-100"
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
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Advanced filters toggle */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={cn(
              "btn-ghost flex items-center gap-2 shrink-0",
              showAdvancedFilters && "text-accent",
            )}
          >
            <SlidersHorizontal size={16} />
            <span className="text-ui font-medium">Filters</span>
            {advancedFilterCount > 0 && (
              <span className="badge-accent">{advancedFilterCount}</span>
            )}
          </button>
        </div>

        {/* Advanced filters panel (date range + amount range only) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-surface border border-border rounded-(--radius-md)">
            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-ui text-text-muted">From date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-ui text-text-muted">To date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input"
              />
            </div>

            {/* Amount min */}
            <div className="flex flex-col gap-1">
              <label className="text-ui text-text-muted">Min amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="input"
                min="0"
                step="0.01"
              />
            </div>

            {/* Amount max */}
            <div className="flex flex-col gap-1">
              <label className="text-ui text-text-muted">Max amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="input"
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
                      ? "bg-text/10 text-text border-text/20"
                      : activeTypePillStyles[t.value]
                    : "bg-surface text-text-secondary border-border opacity-60 hover:opacity-100",
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
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {categoryFilterIds.length === 1
                ? (availableCategories.find((c) => c.id === categoryFilterIds[0])?.name ?? "1 category")
                : `${categoryFilterIds.length} categories`}
              <X size={12} />
            </button>
          )}
          {tagFilterIds.length > 0 && (
            <button
              type="button"
              onClick={() => setTagFilterIds([])}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer transition-opacity hover:opacity-80"
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
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer transition-opacity hover:opacity-80"
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
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer transition-opacity hover:opacity-80"
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
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer transition-opacity hover:opacity-80"
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
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : dateFrom ? `From ${dateFrom}` : `To ${dateTo}`}
              <X size={12} />
            </button>
          )}
          {(amountMin || amountMax) && (
            <button
              type="button"
              onClick={() => { setAmountMin(""); setAmountMax(""); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer transition-opacity hover:opacity-80"
            >
              {amountMin && amountMax ? `${amountMin} - ${amountMax}` : amountMin ? `Min ${amountMin}` : `Max ${amountMax}`}
              <X size={12} />
            </button>
          )}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-ui text-text-muted hover:text-text cursor-pointer bg-transparent border-none px-1 transition-colors"
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
            <span className="text-ui text-warning font-medium hover:underline">
              {uncategorizedCount} uncategorized transaction
              {uncategorizedCount === 1 ? "" : "s"}
              {showUncategorizedOnly ? " (filtered)" : ""}
            </span>
            <Filter size={12} className="text-warning" />
          </button>
        </div>
      )}

      {/* Table Header */}
      <div className="hidden lg:flex items-center gap-4 px-1 text-ui text-text-muted uppercase tracking-wider">
        <div className="w-[34px]" />
        <div className="flex-1">Description</div>
        <button
          onClick={() => toggleSort("date")}
          className="flex items-center gap-1 w-24 bg-transparent border-none text-text-muted hover:text-text cursor-pointer transition-colors text-ui uppercase tracking-wider"
        >
          Date
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <button
          onClick={() => toggleSort("amount")}
          className="flex items-center gap-1 w-28 justify-end bg-transparent border-none text-text-muted hover:text-text cursor-pointer transition-colors text-ui uppercase tracking-wider"
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
              <p className="text-muted">
                No transactions yet. Import transactions or create a new one manually.
              </p>
            ) : (
              <p className="text-muted">
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
      {filteredTransactions.length > PAGE_SIZES[0] && (
        <div className="flex items-center justify-between px-1 py-3 text-ui text-text-muted border-t border-border mt-2">
          <div className="flex items-center gap-1.5">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="text-sm bg-transparent border border-border rounded px-1 py-0.5 text-text-secondary cursor-pointer"
            >
              {PAGE_SIZES.map((size) => (
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

/* ------------------------------------------------------------------ */
/*  TransactionRow                                                     */
/* ------------------------------------------------------------------ */

interface TransactionRowProps {
  transaction: TxDetails;
  openCategoryUpward: boolean;
  isActionOpen: boolean;
  isEditingCategory: boolean;
  isEditingGoal: boolean;
  isEditingTags: boolean;
  availableTags: TransactionTag[];
  availableTagsById: Map<string, TransactionTag>;
  tagUsageCountById: Map<string, number>;
  onToggleAction: () => void;
  onToggleEditCategory: () => void;
  onToggleEditGoal: () => void;
  onToggleEditTags: () => void;
  onCategoryChange: (categoryId: string) => void;
  onGoalChange: (goalId: string | null) => void;
  onTagsChange: (tagIds: string[]) => void;
  onCreateTag: (draft: { name: string; color: string }) => TransactionTag;
  onUpdateTag: (tagId: string, updates: { name: string; color: string }) => TransactionTag;
  onDeleteTag: (tagId: string) => boolean;
  onCreateRule: () => void;
  onAction: (action: "edit" | "duplicate" | "delete") => void;
}

function TransactionRow({
  transaction,
  openCategoryUpward,
  isActionOpen,
  isEditingCategory,
  isEditingGoal,
  isEditingTags,
  availableTags,
  availableTagsById,
  tagUsageCountById,
  onToggleAction,
  onToggleEditCategory,
  onToggleEditGoal,
  onToggleEditTags,
  onCategoryChange,
  onGoalChange,
  onTagsChange,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onCreateRule,
  onAction,
}: TransactionRowProps) {
  const { formatSignedCurrency } = useFormatCurrency();
  const type = transaction.type;
  const iconStyle =
    transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
      ? UNCATEGORIZED_ICON_STYLE
      : iconBoxStyles[type];
  const transferFlow = type === "transfer" && transaction.destinationAccount
    ? resolveTransferFlowAccounts({
        amount: transaction.amount,
        accountName: transaction.account.name,
        counterpartyAccountName: transaction.destinationAccount.name,
        transferPairRole: transaction.transferPairRole,
      })
    : null;
  const resolvedTags = (transaction.tagIds ?? [])
    .map((tagId) => availableTagsById.get(tagId))
    .filter((tag): tag is TransactionTag => tag !== undefined);
  const visibleTags = resolvedTags.slice(0, 2);
  const hiddenTagCount = resolvedTags.length - visibleTags.length;

  return (
    <div className="group flex items-center gap-3 py-3 border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-hover/30 relative">
      {/* Icon — category shape, type-tinted (desktop), clickable to edit category */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleEditCategory();
        }}
        className={cn(
          "w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0 hidden lg:flex cursor-pointer border-none transition-opacity hover:opacity-80",
          iconStyle,
        )}
      >
        <Icon name={transaction.category.icon} size={16} />
      </button>

      {/* -------- Mobile layout -------- */}
      <div className="flex items-start gap-3 lg:hidden flex-1 min-w-0">
        {/* Icon — clickable to edit category */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleEditCategory();
          }}
          className={cn(
            "w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0 cursor-pointer border-none transition-opacity hover:opacity-80",
            iconStyle,
          )}
        >
          <Icon name={transaction.category.icon} size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-ui text-text font-medium line-clamp-2"
              title={transaction.description}
            >
              {transaction.description}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEditCategory();
                }}
                className="cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-80"
              >
                <Badge variant={type}>{transaction.category.name}</Badge>
              </button>
              {isEditingCategory && (
                <CategoryPicker
                  currentCategoryId={transaction.categoryId}
                  onSelect={onCategoryChange}
                  onClose={onToggleEditCategory}
                  openUpward={openCategoryUpward}
                />
              )}
            </div>
            {transaction.goal && (
              <span className="inline-flex items-center gap-1 text-ui text-goal max-w-36">
                <Icon name={transaction.goal.icon} size={10} className="shrink-0" />
                <span className="truncate">{transaction.goal.name}</span>
              </span>
            )}
            {resolvedTags.length > 0 && (
              <span className="inline-flex items-center gap-2 flex-wrap max-w-full">
                {visibleTags.map((tag) => (
                  <span key={tag.id} className="inline-flex items-center gap-1 text-ui max-w-36" style={{ color: tag.color }}>
                    <Tag size={10} className="shrink-0" />
                    <span className="truncate">{tag.name}</span>
                  </span>
                ))}
                {hiddenTagCount > 0 && (
                  <span className="text-ui text-text-muted">+{hiddenTagCount}</span>
                )}
              </span>
            )}
            {transferFlow && (
              <span className="text-ui text-text-muted truncate max-w-48">
                {transferFlow.fromAccountName} &rarr; {transferFlow.toAccountName}
              </span>
            )}
            {transaction.split && (
              <span className="inline-flex items-center gap-1 text-ui text-text-muted">
                <Users size={9} />
                {transaction.split.withPerson}
                {transaction.split.status === "pending" && (
                  <span className="text-split">&middot; pending</span>
                )}
                {transaction.split.status === "reimbursed" && (
                  <span className="text-income">&middot; settled</span>
                )}
              </span>
            )}
            <span className="text-ui text-text-muted">
              {formatDate(transaction.date)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn("text-ui font-medium", getAmountColorClass(type, transaction.amount))}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatSignedCurrency(transaction.amount, transaction.currency)}
          </span>

          {/* Action button — mobile */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAction();
              }}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-opacity",
                isActionOpen ? "opacity-100" : "opacity-60",
              )}
            >
              <MoreHorizontal size={14} />
            </button>
            {isActionOpen && (
              <ActionMenu
                onAction={onAction}
                onEditGoal={onToggleEditGoal}
                onEditTags={onToggleEditTags}
                onRemoveGoal={() => onGoalChange(null)}
                onCreateRule={onCreateRule}
                hasGoal={Boolean(transaction.goalId)}
                hasTags={resolvedTags.length > 0}
                className="right-0"
              />
            )}
            {isEditingGoal && (
              <GoalPicker
                currentGoalId={transaction.goalId}
                onSelect={onGoalChange}
                onClose={onToggleEditGoal}
                className="top-full right-0 mt-1"
              />
            )}
            {isEditingTags && (
              <TagPicker
                tags={availableTags}
                selectedTagIds={transaction.tagIds ?? []}
                onChange={onTagsChange}
                onCreateTag={onCreateTag}
                onUpdateTag={onUpdateTag}
                onDeleteTag={onDeleteTag}
                tagUsageCountById={tagUsageCountById}
                onClose={onToggleEditTags}
                className="top-full right-0 mt-1"
              />
            )}
          </div>
        </div>
      </div>

      {/* -------- Desktop layout -------- */}
      <div className="hidden lg:flex lg:items-center lg:gap-4 lg:flex-1 min-w-0">
        {/* Description + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-ui text-text font-medium line-clamp-2"
              title={transaction.description}
            >
              {transaction.description}
            </span>
            {transaction.split && (
              <span className="inline-flex items-center gap-1 text-ui text-text-muted shrink-0">
                <Users size={9} />
                {transaction.split.withPerson}
                {transaction.split.status === "pending" && (
                  <span className="text-split">&middot; pending</span>
                )}
                {transaction.split.status === "reimbursed" && (
                  <span className="text-income">&middot; settled</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-ui text-text-muted relative flex-wrap">
            <span>
              {transferFlow
                ? `${transferFlow.fromAccountName} \u2192 ${transferFlow.toAccountName}`
                : transaction.account.name}
            </span>
            <span>&middot;</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleEditCategory();
              }}
              className="cursor-pointer bg-transparent border-none p-0 text-ui text-text-muted hover:text-text hover:underline transition-colors"
            >
              {transaction.category.name}
            </button>
            {isEditingCategory && (
              <CategoryPicker
                currentCategoryId={transaction.categoryId}
                onSelect={onCategoryChange}
                onClose={onToggleEditCategory}
                openUpward={openCategoryUpward}
              />
            )}
            {resolvedTags.length > 0 && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-2 flex-wrap max-w-[360px]">
                  {visibleTags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center gap-1 text-ui max-w-40" style={{ color: tag.color }}>
                      <Tag size={10} className="shrink-0" />
                      <span className="truncate">{tag.name}</span>
                    </span>
                  ))}
                  {hiddenTagCount > 0 && (
                    <span className="text-ui text-text-muted">+{hiddenTagCount}</span>
                  )}
                </span>
              </>
            )}
            {transaction.goal && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1 text-goal max-w-40">
                  <Icon name={transaction.goal.icon} size={10} className="shrink-0" />
                  <span className="truncate">{transaction.goal.name}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="w-24 text-ui">{formatDate(transaction.date)}</div>

        {/* Amount */}
        <span
          className={cn(
            "w-28 text-right text-ui font-medium",
            getAmountColorClass(type, transaction.amount),
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formatSignedCurrency(transaction.amount, transaction.currency)}
        </span>

        {/* Action menu trigger */}
        <div className="relative w-8 flex items-center justify-center shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAction();
            }}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-opacity",
              isActionOpen
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            <MoreHorizontal size={14} />
          </button>
          {isActionOpen && (
              <ActionMenu
                onAction={onAction}
                onEditGoal={onToggleEditGoal}
                onEditTags={onToggleEditTags}
                onRemoveGoal={() => onGoalChange(null)}
                onCreateRule={onCreateRule}
                hasGoal={Boolean(transaction.goalId)}
                hasTags={resolvedTags.length > 0}
                className="right-0"
              />
          )}
          {isEditingGoal && (
            <GoalPicker
              currentGoalId={transaction.goalId}
              onSelect={onGoalChange}
              onClose={onToggleEditGoal}
              className="top-full right-0 mt-1"
            />
          )}
          {isEditingTags && (
            <TagPicker
              tags={availableTags}
              selectedTagIds={transaction.tagIds ?? []}
              onChange={onTagsChange}
              onCreateTag={onCreateTag}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
              tagUsageCountById={tagUsageCountById}
              onClose={onToggleEditTags}
              className="top-full right-0 mt-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action Menu                                                        */
/* ------------------------------------------------------------------ */

interface ActionMenuProps {
  onAction: (action: "edit" | "duplicate" | "delete") => void;
  onEditGoal: () => void;
  onEditTags: () => void;
  onRemoveGoal: () => void;
  onCreateRule: () => void;
  hasGoal: boolean;
  hasTags: boolean;
  className?: string;
}

function ActionMenu({
  onAction,
  onEditGoal,
  onEditTags,
  onRemoveGoal,
  onCreateRule,
  hasGoal,
  hasTags,
  className,
}: ActionMenuProps) {
  const itemClass = "menu-item";

  return (
    <div
      className={cn(
        "menu-popover w-44",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onEditGoal}
        className={itemClass}
      >
        <Target size={12} />
        {hasGoal ? "Change goal" : "Set goal"}
      </button>
      {hasGoal && (
        <button
          onClick={onRemoveGoal}
          className={itemClass}
        >
          <Target size={12} />
          Unlink goal
        </button>
      )}
      <button
        onClick={onEditTags}
        className={itemClass}
      >
        <Tags size={12} />
        {hasTags ? "Edit tags" : "Set tags"}
      </button>
      <button
        onClick={onCreateRule}
        className={itemClass}
      >
        <Filter size={12} />
        Create rule
      </button>
      <div className="menu-divider" />
      <button
        onClick={() => onAction("edit")}
        className={itemClass}
      >
        <Pencil size={12} />
        Edit
      </button>
      <button
        onClick={() => onAction("duplicate")}
        className={itemClass}
      >
        <Copy size={12} />
        Duplicate
      </button>
      <div className="menu-divider" />
      <button
        onClick={() => onAction("delete")}
        className="menu-item-danger"
      >
        <Trash2 size={12} />
        Delete
      </button>
    </div>
  );
}
