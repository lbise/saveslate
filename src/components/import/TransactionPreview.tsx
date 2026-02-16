import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { loadTransactions } from "../../lib/transaction-storage";
import { cn, formatCurrency, formatDate, formatSignedCurrency } from "../../lib/utils";
import { ACCOUNTS } from "../../data/mock/accounts";
import type { ParsedRow } from "../../types";

interface TransactionPreviewProps {
  rows: ParsedRow[];
  onConfirm: (
    selectedRows: ParsedRow[],
    accountId: string,
    importName: string,
  ) => void;
  onBack: () => void;
  detectedIdentifier?: string;
  fileName?: string;
}

const PREVIEW_PAGE_SIZES = [20, 25, 50] as const;
const DUPLICATE_WARNING_TEXT = "Duplicate transaction detected";

function normalizeDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function buildTransactionFingerprint(
  accountId: string,
  date: string,
  amount: number,
  currency: string,
  description: string,
): string {
  return [
    accountId,
    date,
    normalizeAmount(amount),
    currency,
    normalizeDescription(description),
  ].join("|");
}

export function TransactionPreview({
  rows,
  onConfirm,
  onBack,
  detectedIdentifier,
  fileName,
}: TransactionPreviewProps) {
  const existingTransactions = useMemo(() => loadTransactions(), []);
  const [selected, setSelected] = useState<Set<number>>(() => {
    // Pre-select all rows without errors
    const set = new Set<number>();
    rows.forEach((r, i) => {
      if (r.errors.length === 0) set.add(i);
    });
    return set;
  });
  const [selectedDuplicateIndexes, setSelectedDuplicateIndexes] = useState<
    Set<number>
  >(new Set());
  const [accountId, setAccountId] = useState(ACCOUNTS[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PREVIEW_PAGE_SIZES[0]);
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);
  const [importName, setImportName] = useState(fileName ?? "");

  // Find matching account ID based on detected identifier
  const matchedAccountId = useMemo(() => {
    if (!detectedIdentifier) return undefined;
    const normalized = detectedIdentifier.replace(/\s/g, "");
    return ACCOUNTS.find(
      (acc) => acc.accountIdentifier?.replace(/\s/g, "") === normalized,
    )?.id;
  }, [detectedIdentifier]);

  // Auto-select account when an identifier is detected
  useEffect(() => {
    if (matchedAccountId) {
      setAccountId(matchedAccountId);
    }
  }, [matchedAccountId]);

  const hasCurrency = useMemo(() => rows.some((r) => r.currency), [rows]);

  const selectedAccountCurrency = useMemo(
    () => ACCOUNTS.find((acc) => acc.id === accountId)?.currency ?? "CHF",
    [accountId],
  );

  const duplicateIndexes = useMemo(() => {
    const existingFingerprints = new Set<string>();
    existingTransactions.forEach((transaction) => {
      existingFingerprints.add(
        buildTransactionFingerprint(
          transaction.accountId,
          transaction.date,
          transaction.amount,
          transaction.currency,
          transaction.description,
        ),
      );
    });

    const seenImportFingerprints = new Set<string>();
    const duplicates = new Set<number>();

    rows.forEach((row, idx) => {
      if (row.errors.length > 0) return;

      const effectiveCurrency = row.currency || selectedAccountCurrency;
      const fingerprint = buildTransactionFingerprint(
        accountId,
        row.date,
        row.amount,
        effectiveCurrency,
        row.description,
      );

      if (
        existingFingerprints.has(fingerprint) ||
        seenImportFingerprints.has(fingerprint)
      ) {
        duplicates.add(idx);
        return;
      }

      seenImportFingerprints.add(fingerprint);
    });

    return duplicates;
  }, [accountId, existingTransactions, rows, selectedAccountCurrency]);

  const warningsByIndex = useMemo(() => {
    const warnings = new Map<number, string[]>();

    rows.forEach((row, idx) => {
      const rowWarnings = [...row.errors];
      if (duplicateIndexes.has(idx)) {
        rowWarnings.push(DUPLICATE_WARNING_TEXT);
      }

      if (rowWarnings.length > 0) {
        warnings.set(idx, rowWarnings);
      }
    });

    return warnings;
  }, [rows, duplicateIndexes]);

  // Reset to first page when rows or warning scope changes
  useEffect(() => {
    setPage(0);
  }, [rows, showWarningsOnly, warningsByIndex]);

  const selectedWithoutDuplicates = useMemo(() => {
    const next = new Set<number>();
    selected.forEach((idx) => {
      if (idx >= 0 && idx < rows.length && !duplicateIndexes.has(idx)) {
        next.add(idx);
      }
    });
    return next;
  }, [duplicateIndexes, rows.length, selected]);

  const selectedDuplicates = useMemo(() => {
    const next = new Set<number>();
    selectedDuplicateIndexes.forEach((idx) => {
      if (idx >= 0 && idx < rows.length && duplicateIndexes.has(idx)) {
        next.add(idx);
      }
    });
    return next;
  }, [duplicateIndexes, rows.length, selectedDuplicateIndexes]);

  const selectedIndexes = useMemo(() => {
    const next = new Set<number>(selectedWithoutDuplicates);
    selectedDuplicates.forEach((idx) => next.add(idx));
    return next;
  }, [selectedDuplicates, selectedWithoutDuplicates]);

  const toggleRow = (idx: number) => {
    if (duplicateIndexes.has(idx)) {
      setSelectedDuplicateIndexes((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    const allSelectableIndexes = rows
      .map((_, idx) => idx)
      .filter((idx) => !duplicateIndexes.has(idx));

    if (selectedWithoutDuplicates.size === allSelectableIndexes.length) {
      setSelected(new Set());
      setSelectedDuplicateIndexes(new Set());
    } else {
      setSelected(new Set(allSelectableIndexes));
    }
  };

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;

    const warningCount = warningsByIndex.size;
    const duplicateCount = duplicateIndexes.size;

    for (const [i, row] of rows.entries()) {
      if (!selectedIndexes.has(i)) continue;
      count++;
      if (row.amount >= 0) income += row.amount;
      else expense += Math.abs(row.amount);
    }

    return { income, expense, count, warningCount, duplicateCount };
  }, [duplicateIndexes, rows, selectedIndexes, warningsByIndex]);

  const handleConfirm = () => {
    const selectedRows = rows.filter((_, i) => selectedIndexes.has(i));
    onConfirm(selectedRows, accountId, importName);
  };

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-text-secondary" />
          <span className="text-ui text-text-muted">
            {stats.count} of {rows.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-income" />
          <span className="text-ui text-text-muted">
            Income:{" "}
            <span className="text-text font-medium">
              {formatCurrency(stats.income)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <span className="text-ui text-text-muted">
            Expense:{" "}
            <span className="text-text font-medium">
              {formatCurrency(stats.expense)}
            </span>
          </span>
        </div>
      </div>

      {/* Account selector and import name */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <label className="label whitespace-nowrap">Import name</label>
            <input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder={fileName ?? "Optional name for this import"}
              className="input text-sm max-w-xs"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <label className="label whitespace-nowrap">Import into</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="select text-sm max-w-xs"
            >
              {ACCOUNTS.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                  {acc.id === matchedAccountId ? " — matched" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warnings filter */}
      {stats.warningCount > 0 && (
        <div className="flex items-center px-1">
          <button
            onClick={() => setShowWarningsOnly(!showWarningsOnly)}
            className={cn(
              "flex items-center gap-2 bg-transparent border-none cursor-pointer transition-opacity px-0 py-0",
              showWarningsOnly ? "opacity-100" : "opacity-60 hover:opacity-100",
            )}
          >
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-ui text-warning font-medium hover:underline">
              {stats.warningCount} with warnings
              {stats.duplicateCount > 0
                ? ` · ${stats.duplicateCount} duplicate transaction${stats.duplicateCount !== 1 ? "s" : ""} detected`
                : ""}
              {showWarningsOnly ? " (filtered)" : ""}
            </span>
            <Filter size={12} className="text-warning" />
          </button>
        </div>
      )}

      {/* Transaction table */}
      {(() => {
        // Filter rows if warnings-only mode is active
        const filteredRows = showWarningsOnly
          ? rows
              .map((row, idx) => ({ row, idx }))
              .filter(({ idx }) => warningsByIndex.has(idx))
          : rows.map((row, idx) => ({ row, idx }));

        const selectableRowCount = rows.length - duplicateIndexes.size;
        const allSelectableSelected =
          selectableRowCount > 0 &&
          selectedWithoutDuplicates.size === selectableRowCount;

        const totalPages = Math.max(
          1,
          Math.ceil(filteredRows.length / pageSize),
        );
        const start = page * pageSize;
        const end = Math.min(start + pageSize, filteredRows.length);
        const displayRows = filteredRows.slice(start, end);

        return (
          <div className="overflow-x-auto rounded-(--radius-md) border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-3 py-2.5 text-left w-8">
                    <input
                      type="checkbox"
                      checked={allSelectableSelected}
                      onChange={toggleAll}
                      className="cursor-pointer accent-text"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                    Category
                  </th>
                  {hasCurrency && (
                    <th className="px-3 py-2.5 text-left text-text-muted font-medium">
                      Currency
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-right text-text-muted font-medium">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 text-center text-text-muted font-medium w-10">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(({ row, idx }) => {
                  const isSelected = selectedIndexes.has(idx);
                  const isDuplicate = duplicateIndexes.has(idx);
                  const rowWarnings = warningsByIndex.get(idx) ?? [];
                  const hasWarnings = rowWarnings.length > 0;

                  return (
                    <tr
                      key={idx}
                      onClick={() => toggleRow(idx)}
                      className={cn(
                        "border-b border-border last:border-b-0 transition-colors",
                        isSelected
                          ? "hover:bg-surface-hover/50"
                          : isDuplicate
                            ? "cursor-pointer opacity-70 hover:opacity-90"
                            : "cursor-pointer opacity-40 hover:opacity-60",
                        hasWarnings && isSelected && "bg-warning/[0.03]",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(idx)}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer accent-text"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">
                        {row.date ? formatDate(row.date) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-text">
                        <span className="break-words">
                          {row.description || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">
                        {row.category || "—"}
                      </td>
                      {hasCurrency && (
                        <td className="px-3 py-2.5 text-text-muted">
                          {row.currency || "—"}
                        </td>
                      )}
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-medium whitespace-nowrap",
                          row.amount >= 0 ? "text-income" : "text-expense",
                        )}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {formatSignedCurrency(
                          row.amount,
                          row.currency || selectedAccountCurrency,
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {hasWarnings ? (
                          <span title={rowWarnings.join(", ")}>
                            <AlertTriangle
                              size={14}
                              className="text-warning inline"
                            />
                          </span>
                        ) : (
                          <Check size={14} className="text-income inline" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredRows.length > PREVIEW_PAGE_SIZES[0] && (
              <div className="flex items-center justify-between px-3 py-2 text-ui text-text-muted bg-surface border-t border-border">
                <div className="flex items-center gap-1.5">
                  <span>Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="text-sm bg-transparent border border-border rounded px-1 py-0.5 text-text-secondary cursor-pointer"
                  >
                    {PREVIEW_PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <span>
                  {start + 1}–{end} of {filteredRows.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                    className="p-0.5 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-none text-text-muted"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
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
      })()}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={stats.count === 0 || !accountId}
          className="btn-primary"
        >
          Import {stats.count} transaction{stats.count !== 1 ? "s" : ""}
        </button>
        <button onClick={onBack} className="btn-secondary">
          <X size={14} />
          Back
        </button>
      </div>
    </div>
  );
}
