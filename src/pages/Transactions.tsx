import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ArrowUpDown,
  Upload,
  Download,
  Plus,
  Target,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge, CategoryPicker, Icon } from "../components/ui";
import {
  getAccountById,
  getCategoryById,
  getGoalById,
  CATEGORIES,
} from "../data/mock";
import { loadImportBatches, loadTransactions } from "../lib/transaction-storage";
import { formatCurrency, formatDate, cn } from "../lib/utils";
import type {
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

const activeTypePillStyles: Record<TransactionType, string> = {
  income: "bg-income/10 text-income border-income/20",
  expense: "bg-expense/10 text-expense border-expense/20",
  transfer: "bg-transfer/10 text-transfer border-transfer/20",
};

function toTransactionWithDetails(transaction: Transaction): TxDetails {
  const inferredType: TransactionType = transaction.amount >= 0 ? "income" : "expense";

  const category = getCategoryById(transaction.categoryId) ?? {
    id: transaction.categoryId,
    name: transaction.categoryId === "uncategorized" ? "Uncategorized" : "Unknown Category",
    type: inferredType,
    icon: "CircleHelp",
  };

  const account = getAccountById(transaction.accountId) ?? {
    id: transaction.accountId,
    name: "Unknown Account",
    type: "checking",
    balance: 0,
    currency: transaction.currency || "CHF",
    color: "#64748b",
    icon: "Wallet",
  };

  const goal = transaction.goalId ? getGoalById(transaction.goalId) : undefined;

  return {
    ...transaction,
    category,
    account,
    goal,
  };
}

function loadTransactionsWithDetails(): TxDetails[] {
  return loadTransactions().map((transaction) => toTransactionWithDetails(transaction));
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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Popover state — at most one open at a time
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, typeFilter, categoryFilter, batchFilter, sortField, sortDirection]);

  const closePopovers = () => {
    setOpenActionId(null);
    setEditingCategoryId(null);
  };

  const toggleAction = (txId: string) => {
    setEditingCategoryId(null);
    setOpenActionId((prev) => (prev === txId ? null : txId));
  };

  const toggleEditCategory = (txId: string) => {
    setOpenActionId(null);
    setEditingCategoryId((prev) => (prev === txId ? null : txId));
  };

  const handleAction = (
    txId: string,
    action: "edit" | "duplicate" | "delete",
  ) => {
    closePopovers();
    if (action === "delete") {
      setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
    } else if (action === "duplicate") {
      setTransactions((prev) => {
        const tx = prev.find((t) => t.id === txId);
        if (!tx) return prev;
        const dup = { ...tx, id: `${tx.id}-dup-${Date.now()}` };
        const idx = prev.findIndex((t) => t.id === txId);
        const next = [...prev];
        next.splice(idx + 1, 0, dup);
        return next;
      });
    }
    // edit: no-op for mockup
  };

  const handleCategoryChange = (txId: string, categoryId: string) => {
    const category = getCategoryById(categoryId);
    if (!category) return;
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, categoryId, category } : tx)),
    );
    setEditingCategoryId(null);
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

  // Import batches for the dropdown
  const importBatches = useMemo(() => loadImportBatches(), []);

  // Filtered and sorted
  const filteredTransactions = useMemo(() => {
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

    if (categoryFilter) {
      result = result.filter((t) => t.categoryId === categoryFilter);
    }

    if (batchFilter === "manual") {
      result = result.filter((t) => !t.importBatchId);
    } else if (batchFilter) {
      result = result.filter((t) => t.importBatchId === batchFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [
    transactions,
    searchQuery,
    typeFilter,
    categoryFilter,
    batchFilter,
    sortField,
    sortDirection,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const totalIncome = filteredTransactions
    .filter((t) => t.category.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.category.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

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
        categoryId: categoryFilter,
        importBatchId: batchFilter,
        sortField,
        sortDirection,
      },
      transactionCount: filteredTransactions.length,
      transactions: filteredTransactions.map((transaction) => ({
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.category.type,
        categoryId: transaction.categoryId,
        categoryName: transaction.category.name,
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        goalId: transaction.goalId ?? null,
        goalName: transaction.goal?.name ?? null,
        importBatchId: transaction.importBatchId ?? null,
        split: transaction.split ?? null,
        rawData: transaction.rawData ?? null,
      })),
    };

    const fileDate = new Date().toISOString().split("T")[0];
    const fileName = `transactions-filtered-${fileDate}.json`;
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
      {(openActionId || editingCategoryId) && (
        <div className="fixed inset-0 z-10" onClick={closePopovers} />
      )}

      {/* Header */}
      <PageHeader title="Transactions">
        <button className="btn-ghost">
          <Plus size={16} />
          New
        </button>
        <button className="btn-primary" onClick={() => navigate("/import")}>
          <Upload size={16} />
          Import
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          disabled={filteredTransactions.length === 0}
          className="btn-ghost"
        >
          <Download size={16} />
          Export
        </button>
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
      <div className="space-y-4">
        {/* Row 1: Search + Category dropdown + Batch dropdown */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Category dropdown */}
          <select
            value={categoryFilter ?? ""}
            onChange={(e) =>
              setCategoryFilter(e.target.value === "" ? null : e.target.value)
            }
            className="select w-full lg:w-48"
          >
            <option value="">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Import batch dropdown */}
          <select
            value={batchFilter ?? ""}
            onChange={(e) =>
              setBatchFilter(e.target.value === "" ? null : e.target.value)
            }
            className="select w-full lg:w-56"
          >
            <option value="">All Sources</option>
            <option value="manual">Manual entries</option>
            {importBatches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name || batch.fileName}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Type filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_LABELS.map((t) => {
            const isActive = typeFilter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => {
                  setTypeFilter(t.value);
                  setCategoryFilter(null);
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
        </div>
      </div>

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
            <p className="text-muted">
              No transactions found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          paginatedTransactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              isActionOpen={openActionId === tx.id}
              isEditingCategory={editingCategoryId === tx.id}
              onToggleAction={() => toggleAction(tx.id)}
              onToggleEditCategory={() => toggleEditCategory(tx.id)}
              onCategoryChange={(catId) => handleCategoryChange(tx.id, catId)}
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="p-0.5 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-text-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              className="p-0.5 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-text-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
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
  onToggleAction: () => void;
  onToggleEditCategory: () => void;
  onCategoryChange: (categoryId: string) => void;
  onAction: (action: "edit" | "duplicate" | "delete") => void;
}

function TransactionRow({
  transaction,
  isActionOpen,
  isEditingCategory,
  onToggleAction,
  onToggleEditCategory,
  onCategoryChange,
  onAction,
}: TransactionRowProps) {
  const type = transaction.category.type;

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
          iconBoxStyles[type],
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
            iconBoxStyles[type],
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
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface text-ui border border-border">
                <Target size={9} />
                {transaction.goal.name}
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
            {formatCurrency(transaction.amount, transaction.currency)}
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
              <ActionMenu onAction={onAction} className="right-0" />
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
            {transaction.goal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface text-ui border border-border shrink-0">
                <Target size={9} />
                {transaction.goal.name}
              </span>
            )}
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
          <div className="flex items-center gap-1 text-ui text-text-muted relative">
            <span>{transaction.account.name}</span>
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
          {formatCurrency(transaction.amount)}
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
            <ActionMenu onAction={onAction} className="right-0" />
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
  className?: string;
}

function ActionMenu({ onAction, className }: ActionMenuProps) {
  const itemClass =
    "flex items-center gap-2.5 w-full px-3 py-2 text-left bg-transparent border-none cursor-pointer text-ui hover:bg-surface-hover transition-colors";

  return (
    <div
      className={cn(
        "absolute top-full w-40 bg-surface border border-border rounded-(--radius-md) py-1 z-20 shadow-(--shadow-md)",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
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
