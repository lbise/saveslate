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
  Wallet,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader, PageHeaderActions } from "../components/layout";
import { Badge, CategoryPicker, GoalPicker, Icon, Modal, MultiSelectDropdown, PaginationButtons } from "../components/ui";
import {
  getAccountById,
  getAccounts,
  getCategoryById,
  getGoalById,
  getGoals,
  CATEGORIES,
} from "../data/mock";
import {
  deleteImportBatch,
  loadImportBatches,
  loadTransactions,
  pruneEmptyImportBatches,
  renameImportBatch,
  saveTransactions,
} from "../lib/transaction-storage";
import {
  inferTransactionType,
  UNCATEGORIZED_CATEGORY_ID,
} from "../lib/transaction-type";
import { formatCurrency, formatDate, cn } from "../lib/utils";
import type {
  ImportBatch,
  AutomationRulePrefillDraft,
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

const amountPrefix: Record<TransactionType, string> = {
  income: "+",
  expense: "-",
  transfer: "",
};

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

interface SourceOption {
  id: string;
  label: string;
  count: number;
  deletable: boolean;
}

function toTransactionWithDetails(transaction: Transaction): TxDetails {
  const inferredType: TransactionType = inferTransactionType(transaction);

  const baseCategory = getCategoryById(transaction.categoryId) ?? {
    id: transaction.categoryId,
    name:
      transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
        ? "Uncategorized"
        : "Unknown Category",
    type: inferredType,
    icon: "CircleHelp",
  };

  const category =
    transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
      ? { ...baseCategory, type: inferredType }
      : baseCategory;

  const account = getAccountById(transaction.accountId) ?? {
    id: transaction.accountId,
    name: "Unknown Account",
    type: "checking",
    balance: 0,
    currency: transaction.currency || "CHF",
    icon: "Wallet",
  };

  const goal = transaction.goalId ? getGoalById(transaction.goalId) : undefined;

  const destinationAccount = transaction.destinationAccountId
    ? (getAccountById(transaction.destinationAccountId) ?? {
        id: transaction.destinationAccountId,
        name: "Unknown Account",
        type: "checking" as const,
        balance: 0,
        currency: transaction.currency || "CHF",
        icon: "Wallet",
      })
    : undefined;

  return {
    ...transaction,
    category,
    account,
    destinationAccount,
    goal,
  };
}

function loadTransactionsWithDetails(): TxDetails[] {
  return loadTransactions().map((transaction) => toTransactionWithDetails(transaction));
}

function toStoredTransaction(transaction: TxDetails): Transaction {
  const { category, account, goal, ...storedTransaction } = transaction;
  return storedTransaction;
}

function persistTransactions(transactions: TxDetails[]): void {
  saveTransactions(transactions.map((transaction) => toStoredTransaction(transaction)));
}

export function Transactions() {
  const navigate = useNavigate();
  // Mutable local state so inline actions (delete, duplicate) work
  const [transactions, setTransactions] = useState(() =>
    loadTransactionsWithDetails(),
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilterIds, setCategoryFilterIds] = useState<string[]>([]);
  const [sourceFilterIds, setSourceFilterIds] = useState<string[]>([]);
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [goalFilterIds, setGoalFilterIds] = useState<string[]>([]);
  const [accountFilterIds, setAccountFilterIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Popover state — at most one open at a time
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<SourceOption | null>(null);
  const [sourceToRename, setSourceToRename] = useState<SourceOption | null>(null);
  const [sourceRenameValue, setSourceRenameValue] = useState("");

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [
    searchQuery,
    typeFilter,
    categoryFilterIds,
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
    setIsSourceMenuOpen(false);
  };

  const toggleAction = (txId: string) => {
    setEditingCategoryId(null);
    setEditingGoalId(null);
    setOpenActionId((prev) => (prev === txId ? null : txId));
  };

  const toggleEditCategory = (txId: string) => {
    setOpenActionId(null);
    setEditingGoalId(null);
    setEditingCategoryId((prev) => (prev === txId ? null : txId));
  };

  const toggleEditGoal = (txId: string) => {
    setOpenActionId(null);
    setEditingCategoryId(null);
    setEditingGoalId((prev) => (prev === txId ? null : txId));
  };

  const handleAction = (
    txId: string,
    action: "edit" | "duplicate" | "delete",
  ) => {
    closePopovers();
    if (action === "delete") {
      setTransactions((prev) => {
        const nextTransactions = prev.filter((tx) => tx.id !== txId);
        persistTransactions(nextTransactions);
        return nextTransactions;
      });
    } else if (action === "duplicate") {
      setTransactions((prev) => {
        const tx = prev.find((t) => t.id === txId);
        if (!tx) return prev;
        const dup = { ...tx, id: `${tx.id}-dup-${Date.now()}` };
        const idx = prev.findIndex((t) => t.id === txId);
        const next = [...prev];
        next.splice(idx + 1, 0, dup);
        persistTransactions(next);
        return next;
      });
    }
    // edit: no-op for mockup
  };

  const handleCategoryChange = (txId: string, categoryId: string) => {
    const category = getCategoryById(categoryId);
    if (!category) return;
    setTransactions((prev) => {
      const nextTransactions = prev.map((tx) => {
        if (tx.id !== txId) return tx;

        const categoryType =
          categoryId === UNCATEGORIZED_CATEGORY_ID
            ? inferTransactionType(tx)
            : category.type;

        return {
          ...tx,
          categoryId,
          category: { ...category, type: categoryType },
        };
      });

      persistTransactions(nextTransactions);
      return nextTransactions;
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

      persistTransactions(nextTransactions);
      return nextTransactions;
    });

    setEditingGoalId(null);
    setOpenActionId(null);
  };

  const openQuickAutoRuleModal = (transaction: TxDetails) => {
    closePopovers();

    const fallbackCategoryId = CATEGORIES.find((category) => {
      return category.type === inferTransactionType(transaction);
    })?.id ?? CATEGORIES[0]?.id ?? UNCATEGORIZED_CATEGORY_ID;

    const prefillCategoryId = transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
      ? fallbackCategoryId
      : transaction.categoryId;

    const keyword = transaction.description.trim();

    let prefillName = '';
    if (transaction.categoryId !== UNCATEGORIZED_CATEGORY_ID) {
      const nameParts: string[] = [transaction.category.name];
      const targetParts: string[] = [];
      if (transaction.goal) targetParts.push(transaction.goal.name);
      if (transaction.destinationAccount) targetParts.push(transaction.destinationAccount.name);
      if (targetParts.length > 0) {
        nameParts.push(targetParts.join(', '));
      }
      prefillName = nameParts.join(' → ');
    }

    const prefillDraft: AutomationRulePrefillDraft = {
      name: prefillName,
      categoryId: prefillCategoryId,
      goalId: transaction.goalId,
      destinationAccountId: transaction.destinationAccountId,
      isEnabled: true,
      triggers: ['on-import', 'manual-run'],
      matchMode: 'any',
      applyToUncategorizedOnly: true,
      mergeIntoExistingCategoryRule: true,
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

  // Categories available for the currently selected type
  const availableCategories = useMemo(() => {
    if (typeFilter === "all") return CATEGORIES;
    return CATEGORIES.filter((c) => c.type === typeFilter);
  }, [typeFilter]);

  const categoryOptions = useMemo(
    () =>
      availableCategories.map((c) => ({
        id: c.id,
        label: c.name,
        group: c.type.charAt(0).toUpperCase() + c.type.slice(1),
      })),
    [availableCategories],
  );

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
    setTransactions((prev) =>
      prev.filter((transaction) => transaction.importBatchId !== sourceId),
    );
    setSourceToDelete(null);
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
          t.goal?.name.toLowerCase().includes(query),
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((t) => t.category.type === typeFilter);
    }

    if (categoryFilterIds.length > 0) {
      const selected = new Set(categoryFilterIds);
      result = result.filter((t) => selected.has(t.categoryId));
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
      result = result.filter(
        (t) => selected.has(t.accountId) || (t.destinationAccountId && selected.has(t.destinationAccountId)),
      );
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
    typeFilter,
    categoryFilterIds,
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
    let result = showUncategorizedOnly
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
    activeSourceFilterIds.length > 0 ||
    typeFilter !== "all" ||
    searchQuery !== "" ||
    advancedFilterCount > 0;

  const clearAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setCategoryFilterIds([]);
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
    .filter((t) => t.category.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.category.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalTransfers = filteredTransactions
    .filter((t) => t.category.type === "transfer")
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
        type: transaction.category.type,
        categoryId: transaction.categoryId,
        categoryName: transaction.category.name,
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        destinationAccountId: transaction.destinationAccountId ?? null,
        destinationAccountName: transaction.destinationAccount?.name ?? null,
        goalId: transaction.goalId ?? null,
        goalName: transaction.goal?.name ?? null,
        importBatchId: transaction.importBatchId ?? null,
        split: transaction.split ?? null,
        metadata: transaction.metadata ?? null,
        rawData: transaction.rawData ?? null,
      })),
    };

    const fileDate = new Date().toISOString().split("T")[0];
    const fileName = `melomoney-transactions-filtered-${fileDate}.json`;
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
      {(openActionId || editingCategoryId || editingGoalId) && (
        <div className="fixed inset-0 z-10" onClick={closePopovers} />
      )}

      {sourceToDelete && (
        <Modal onClose={() => setSourceToDelete(null)} panelClassName="max-w-md p-5 space-y-4">
          <div>
              <h2 className="heading-2">Delete source?</h2>
              <p className="text-body">
                This will permanently delete <span className="text-text">{sourceToDelete.label}</span> and
                <span className="text-expense"> {sourceToDelete.count} transaction{sourceToDelete.count === 1 ? "" : "s"}</span>.
              </p>
              <p className="text-ui text-text-muted">This action cannot be undone.</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSourceToDelete(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSource}
                  className="btn-secondary border-expense/40 text-expense hover:bg-expense/10 hover:border-expense"
                >
                  Delete source
                </button>
              </div>
          </div>
        </Modal>
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

      {/* Header */}
      <PageHeader title="Transactions">
        <PageHeaderActions
          onImport={() => navigate("/import")}
          onExport={handleExportJson}
          onCreate={() => undefined}
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

        {/* Row 2: 4 multi-select dropdowns + Filters toggle */}
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
          paginatedTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              isActionOpen={openActionId === tx.id}
              isEditingCategory={editingCategoryId === tx.id}
              isEditingGoal={editingGoalId === tx.id}
              onToggleAction={() => toggleAction(tx.id)}
              onToggleEditCategory={() => toggleEditCategory(tx.id)}
              onToggleEditGoal={() => toggleEditGoal(tx.id)}
              onCategoryChange={(catId) => handleCategoryChange(tx.id, catId)}
              onGoalChange={(goalId) => handleGoalChange(tx.id, goalId)}
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
  isActionOpen: boolean;
  isEditingCategory: boolean;
  isEditingGoal: boolean;
  onToggleAction: () => void;
  onToggleEditCategory: () => void;
  onToggleEditGoal: () => void;
  onCategoryChange: (categoryId: string) => void;
  onGoalChange: (goalId: string | null) => void;
  onCreateRule: () => void;
  onAction: (action: "edit" | "duplicate" | "delete") => void;
}

function TransactionRow({
  transaction,
  isActionOpen,
  isEditingCategory,
  isEditingGoal,
  onToggleAction,
  onToggleEditCategory,
  onToggleEditGoal,
  onCategoryChange,
  onGoalChange,
  onCreateRule,
  onAction,
}: TransactionRowProps) {
  const type = transaction.category.type;
  const iconStyle =
    transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
      ? UNCATEGORIZED_ICON_STYLE
      : iconBoxStyles[type];

  return (
    <div className="group flex items-center gap-3.5 py-3.5 border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-hover/30 relative">
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
              className="text-body text-text line-clamp-2"
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
                  className="top-full left-0 mt-1"
                />
              )}
            </div>
            {transaction.goal && (
              <span className="inline-flex items-center gap-1 text-ui text-goal max-w-36">
                <Target size={10} className="shrink-0" />
                <span className="truncate">{transaction.goal.name}</span>
              </span>
            )}
            {type === "transfer" && transaction.destinationAccount && (
              <span className="text-ui text-text-muted truncate max-w-48">
                {transaction.account.name} &rarr; {transaction.destinationAccount.name}
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
            className={cn("text-ui font-medium", amountColors[type])}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {amountPrefix[type]}
            {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
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
                onRemoveGoal={() => onGoalChange(null)}
                onCreateRule={onCreateRule}
                hasGoal={Boolean(transaction.goalId)}
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
          </div>
        </div>
      </div>

      {/* -------- Desktop layout -------- */}
      <div className="hidden lg:flex lg:items-center lg:gap-4 lg:flex-1 min-w-0">
        {/* Description + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-body text-text line-clamp-2"
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
              {type === "transfer" && transaction.destinationAccount
                ? `${transaction.account.name} \u2192 ${transaction.destinationAccount.name}`
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
                className="top-full left-0 mt-1"
              />
            )}
            {transaction.goal && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1 text-goal max-w-40">
                  <Target size={10} className="shrink-0" />
                  <span className="truncate">{transaction.goal.name}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="w-24 text-body">{formatDate(transaction.date)}</div>

        {/* Amount */}
        <span
          className={cn(
            "w-28 text-right text-body font-medium",
            amountColors[type],
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {amountPrefix[type]}
          {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
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
                onRemoveGoal={() => onGoalChange(null)}
                onCreateRule={onCreateRule}
                hasGoal={Boolean(transaction.goalId)}
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
  onRemoveGoal: () => void;
  onCreateRule: () => void;
  hasGoal: boolean;
  className?: string;
}

function ActionMenu({
  onAction,
  onEditGoal,
  onRemoveGoal,
  onCreateRule,
  hasGoal,
  className,
}: ActionMenuProps) {
  const itemClass =
    "flex items-center gap-2.5 w-full px-3 py-2 text-left bg-transparent border-none cursor-pointer text-ui hover:bg-surface-hover transition-colors";

  return (
    <div
      className={cn(
        "absolute top-full w-44 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md)",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onEditGoal}
        className={cn(itemClass, "text-text-secondary hover:text-text")}
      >
        <Target size={12} />
        {hasGoal ? "Change goal" : "Set goal"}
      </button>
      {hasGoal && (
        <button
          onClick={onRemoveGoal}
          className={cn(itemClass, "text-text-muted hover:text-text")}
        >
          <Target size={12} />
          Unlink goal
        </button>
      )}
      <button
        onClick={onCreateRule}
        className={cn(itemClass, "text-text-secondary hover:text-text")}
      >
        <Filter size={12} />
        Create rule
      </button>
      <div className="h-px bg-border mx-2 my-1" />
      <button
        onClick={() => onAction("edit")}
        className={cn(itemClass, "text-text-secondary hover:text-text")}
      >
        <Pencil size={12} />
        Edit
      </button>
      <button
        onClick={() => onAction("duplicate")}
        className={cn(itemClass, "text-text-secondary hover:text-text")}
      >
        <Copy size={12} />
        Duplicate
      </button>
      <div className="h-px bg-border mx-2 my-1" />
      <button
        onClick={() => onAction("delete")}
        className={cn(itemClass, "text-expense hover:text-expense")}
      >
        <Trash2 size={12} />
        Delete
      </button>
    </div>
  );
}
