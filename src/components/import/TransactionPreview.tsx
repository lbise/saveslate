import { Fragment, useCallback, useState, useMemo } from "react";
import {
  AlertTriangle,
  Eye,
  Link2,
  Link2Off,
  Check,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AccountFormModal,
  DEFAULT_ACCOUNT_FORM_STATE,
  type AccountFormSubmitPayload,
} from "../accounts";
import { useAccounts, useCreateAccount, useTransactions } from "../../hooks/api";
import { cn, formatDate } from "../../lib/utils";
import { useFormatCurrency } from "../../hooks";
import { Card } from "../ui/Card";
import { PaginationButtons } from "../ui";
import type { ParsedRow } from "../../types";

interface TransactionPreviewProps {
  rows: ParsedRow[];
  onConfirm: (
    selectedRowIndexes: number[],
    accountId: string,
    importName: string,
    transferLinks: Array<{ rowIndex: number; matchedTransactionId: string }>,
  ) => void;
  onBack: () => void;
  detectedIdentifier?: string;
  fileName?: string;
}

const PREVIEW_PAGE_SIZES = [20, 25, 50] as const;
const DUPLICATE_WARNING_TEXT = "Duplicate transaction detected";
const POSSIBLE_MATCH_WARNING_TEXT = "Possible existing match (no transaction ID)";

type TransferLinkDecision = "link" | "separate";

function normalizeDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function normalizeTransactionId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

function buildTransactionFingerprint(
  accountId: string,
  date: string,
  time: string | undefined,
  amount: number,
  currency: string,
  description: string,
): string {
  return [
    accountId,
    date,
    time ?? "00:00:00",
    normalizeAmount(amount),
    currency,
    normalizeDescription(description),
  ].join("|");
}

function getDateDistanceInDays(left: string, right: string): number {
  const leftDate = new Date(`${left}T00:00:00`);
  const rightDate = new Date(`${right}T00:00:00`);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return Number.MAX_SAFE_INTEGER;
  }
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.abs(Math.round((leftDate.getTime() - rightDate.getTime()) / dayMs));
}

export function TransactionPreview({
  rows,
  onConfirm,
  onBack,
  detectedIdentifier,
  fileName,
}: TransactionPreviewProps) {
  const { formatCurrency, formatSignedCurrency } = useFormatCurrency();
  const { data: accounts = [] } = useAccounts();
  const createAccountMutation = useCreateAccount();
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] =
    useState(false);
  const { data: existingTransactionsData } = useTransactions({ pageSize: 10000 });
  const existingTransactions = useMemo(
    () => existingTransactionsData?.items ?? [],
    [existingTransactionsData],
  );
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
  const [accountId, setAccountId] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PREVIEW_PAGE_SIZES[0]);
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);
  const [showMatchesOnly, setShowMatchesOnly] = useState(false);
  const [importName, setImportName] = useState(fileName ?? "");
  const [expandedMatchRowIndex, setExpandedMatchRowIndex] = useState<number | null>(null);

  // Find matching account ID based on detected identifier
  const matchedAccountId = useMemo(() => {
    if (!detectedIdentifier) return undefined;
    const normalized = detectedIdentifier.replace(/\s/g, "");
    return accounts.find(
      (acc) => acc.accountIdentifier?.replace(/\s/g, "") === normalized,
    )?.id;
  }, [accounts, detectedIdentifier]);

  const effectiveAccountId = accountId || matchedAccountId || accounts[0]?.id || "";

  const hasCurrency = useMemo(() => rows.some((r) => r.currency), [rows]);
  const hasTime = useMemo(() => rows.some((r) => r.time), [rows]);
  const hasTransactionId = useMemo(
    () => rows.some((r) => Boolean(normalizeTransactionId(r.transactionId))),
    [rows],
  );

  const selectedAccountCurrency = useMemo(
    () => accounts.find((acc) => acc.id === effectiveAccountId)?.currency ?? "CHF",
    [accounts, effectiveAccountId],
  );

  const hasAccounts = accounts.length > 0;

  const duplicateIndexes = useMemo(() => {
    const existingTransactionIds = new Set<string>();
    const existingFingerprints = new Set<string>();
    existingTransactions.forEach((transaction) => {
      if (transaction.accountId === effectiveAccountId) {
        const transactionId = normalizeTransactionId(transaction.transactionId);
        if (transactionId) {
          existingTransactionIds.add(transactionId);
        }
      }

      existingFingerprints.add(
        buildTransactionFingerprint(
          transaction.accountId,
          transaction.date,
          transaction.time,
          transaction.amount,
          transaction.currency,
          transaction.description,
        ),
      );
    });

    const duplicates = new Set<number>();

    rows.forEach((row, idx) => {
      if (row.errors.length > 0) return;

      const transactionId = normalizeTransactionId(row.transactionId);
      if (!transactionId) {
        return;
      }

      if (existingTransactionIds.has(transactionId)) {
        duplicates.add(idx);
      }
    });

    return duplicates;
  }, [effectiveAccountId, existingTransactions, rows]);

  const possibleMatchIndexes = useMemo(() => {
    const existingFingerprints = new Set<string>();

    existingTransactions.forEach((transaction) => {
      if (transaction.accountId !== effectiveAccountId) {
        return;
      }

      existingFingerprints.add(
        buildTransactionFingerprint(
          transaction.accountId,
          transaction.date,
          transaction.time,
          transaction.amount,
          transaction.currency,
          transaction.description,
        ),
      );
    });

    const possibleMatches = new Set<number>();

    rows.forEach((row, idx) => {
      if (row.errors.length > 0 || duplicateIndexes.has(idx)) {
        return;
      }

      if (normalizeTransactionId(row.transactionId)) {
        return;
      }

      const effectiveCurrency = row.currency || selectedAccountCurrency;
      const fingerprint = buildTransactionFingerprint(
        effectiveAccountId,
        row.date,
        row.time,
        row.amount,
        effectiveCurrency,
        row.description,
      );

      if (existingFingerprints.has(fingerprint)) {
        possibleMatches.add(idx);
      }
    });

    return possibleMatches;
  }, [
    effectiveAccountId,
    duplicateIndexes,
    existingTransactions,
    rows,
    selectedAccountCurrency,
  ]);

  const transferPairCandidatesByIndex = useMemo(() => {
    const candidates = new Map<number, {
      matchedTransactionId: string;
      accountName: string;
      amount: number;
      currency: string;
      date: string;
      time?: string;
      description: string;
      transactionId?: string;
      isAlreadyLinked: boolean;
    }>();
    const accountsById = new Map(accounts.map((account) => [account.id, account] as const));

    rows.forEach((row, idx) => {
      if (row.errors.length > 0 || duplicateIndexes.has(idx)) {
        return;
      }

      const normalizedTransactionId = normalizeTransactionId(row.transactionId);
      if (!normalizedTransactionId) {
        return;
      }

      const expectedCurrency = row.currency || selectedAccountCurrency;

      const matchingTransactions = existingTransactions.filter((transaction) => {
        if (transaction.accountId === effectiveAccountId) {
          return false;
        }

        const existingTransactionId = normalizeTransactionId(transaction.transactionId);
        if (!existingTransactionId || existingTransactionId !== normalizedTransactionId) {
          return false;
        }
        if (transaction.currency !== expectedCurrency) {
          return false;
        }
        if (Math.abs(transaction.amount) !== Math.abs(row.amount)) {
          return false;
        }
        if (transaction.amount * row.amount >= 0) {
          return false;
        }

        const dayDistance = getDateDistanceInDays(transaction.date, row.date);
        return dayDistance <= 2;
      });

      if (matchingTransactions.length === 0) {
        return;
      }

      const bestMatch = matchingTransactions
        .sort((left, right) => getDateDistanceInDays(left.date, row.date) - getDateDistanceInDays(right.date, row.date))[0];
      const accountName = accountsById.get(bestMatch.accountId)?.name ?? 'Unknown account';
      candidates.set(idx, {
        matchedTransactionId: bestMatch.id,
        accountName,
        amount: bestMatch.amount,
        currency: bestMatch.currency,
        date: bestMatch.date,
        time: bestMatch.time,
        description: bestMatch.description,
        transactionId: bestMatch.transactionId,
        isAlreadyLinked: Boolean(bestMatch.transferPairId),
      });
    });

    return candidates;
  }, [
    accounts,
    duplicateIndexes,
    effectiveAccountId,
    existingTransactions,
    rows,
    selectedAccountCurrency,
  ]);

  const [transferLinkDecisions, setTransferLinkDecisions] = useState<Map<number, TransferLinkDecision>>(new Map());

  const getTransferDecision = useCallback((rowIndex: number): TransferLinkDecision => {
    return transferLinkDecisions.get(rowIndex) ?? 'link';
  }, [transferLinkDecisions]);

  const toggleTransferLinkDecision = useCallback((rowIndex: number) => {
    setTransferLinkDecisions((previous) => {
      const next = new Map(previous);
      const current = next.get(rowIndex) ?? 'link';
      if (current === 'link') {
        next.set(rowIndex, 'separate');
      } else {
        next.delete(rowIndex);
      }
      return next;
    });
  }, []);

  const toggleMatchPreview = useCallback((rowIndex: number) => {
    setExpandedMatchRowIndex((current) => (current === rowIndex ? null : rowIndex));
  }, []);

  const warningsByIndex = useMemo(() => {
    const warnings = new Map<number, string[]>();

    rows.forEach((row, idx) => {
      const rowWarnings = [...row.errors];
      if (duplicateIndexes.has(idx)) {
        rowWarnings.push(DUPLICATE_WARNING_TEXT);
      }
      if (possibleMatchIndexes.has(idx)) {
        rowWarnings.push(POSSIBLE_MATCH_WARNING_TEXT);
      }

      if (rowWarnings.length > 0) {
        warnings.set(idx, rowWarnings);
      }
    });

    return warnings;
  }, [
    duplicateIndexes,
    possibleMatchIndexes,
    rows,
  ]);

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
    const possibleMatchCount = possibleMatchIndexes.size;
    const transferMatchCount = transferPairCandidatesByIndex.size;
    const linkedTransferCount = Array.from(transferPairCandidatesByIndex.keys())
      .filter((idx) => getTransferDecision(idx) === 'link').length;

    for (const [i, row] of rows.entries()) {
      if (!selectedIndexes.has(i)) continue;
      count++;
      if (row.amount >= 0) income += row.amount;
      else expense += Math.abs(row.amount);
    }

    return {
      income,
      expense,
      count,
      warningCount,
      duplicateCount,
      possibleMatchCount,
      transferMatchCount,
      linkedTransferCount,
    };
  }, [
    duplicateIndexes,
    getTransferDecision,
    possibleMatchIndexes,
    rows,
    selectedIndexes,
    transferPairCandidatesByIndex,
    warningsByIndex,
  ]);

  const handleConfirm = () => {
    if (!effectiveAccountId) {
      return;
    }

    const selectedRowIndexes = rows
      .map((_, index) => index)
      .filter((index) => selectedIndexes.has(index));

    const transferLinks = selectedRowIndexes
      .filter((rowIndex) => getTransferDecision(rowIndex) === 'link')
      .map((rowIndex) => {
        const candidate = transferPairCandidatesByIndex.get(rowIndex);
        if (!candidate) {
          return null;
        }
        return {
          rowIndex,
          matchedTransactionId: candidate.matchedTransactionId,
        };
      })
      .filter((entry): entry is { rowIndex: number; matchedTransactionId: string } => entry !== null);

    onConfirm(selectedRowIndexes, effectiveAccountId, importName, transferLinks);
  };

  const handleCreateAccount = async (accountPayload: AccountFormSubmitPayload) => {
    try {
      const result = await createAccountMutation.mutateAsync(accountPayload);
      const createdAccount = result as { id: string; name: string };
      setAccountId(createdAccount.id);
      setIsCreateAccountModalOpen(false);
      toast.success(`Account "${createdAccount.name}" created`);
    } catch {
      toast.error("Failed to create account");
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="text-sm text-dimmed">
            {stats.count} of {rows.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-income" />
          <span className="text-sm text-dimmed">
            Income:{" "}
            <span className="text-foreground font-medium">
              {formatCurrency(stats.income)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <span className="text-sm text-dimmed">
            Expense:{" "}
            <span className="text-foreground font-medium">
              {formatCurrency(stats.expense)}
            </span>
          </span>
        </div>
      </div>

      {/* Account selector and import name */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Import name</Label>
            <Input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder={fileName ?? "Optional name for this import"}
              className="text-sm max-w-xs"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {hasAccounts ? (
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap">Import into</Label>
              <Select value={effectiveAccountId} onValueChange={(value) => setAccountId(value)}>
                <SelectTrigger className="text-sm max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                      {acc.id === matchedAccountId ? " — matched" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Card className="p-3 border-warning/30 space-y-3">
              <p className="text-sm text-warning">
                No accounts yet. Create an account to choose where these transactions will be imported.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateAccountModalOpen(true)}
              >
                Create account
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Warnings filter */}
      {stats.warningCount > 0 && (
        <div className="flex items-center px-1">
          <button
            onClick={() => {
              const nextWarningsOnly = !showWarningsOnly;
              setShowWarningsOnly(nextWarningsOnly);
              if (nextWarningsOnly) {
                setShowMatchesOnly(false);
              }
              setPage(0);
            }}
            className={cn(
              "flex items-center gap-2 bg-transparent border-none cursor-pointer transition-opacity px-0 py-0",
              showWarningsOnly ? "opacity-100" : "opacity-60 hover:opacity-100",
            )}
          >
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-sm text-warning font-medium hover:underline">
              {stats.warningCount} with warnings
              {stats.duplicateCount > 0
                ? ` · ${stats.duplicateCount} duplicate transaction${stats.duplicateCount !== 1 ? "s" : ""} detected`
                : ""}
              {stats.possibleMatchCount > 0
                ? ` · ${stats.possibleMatchCount} possible match${stats.possibleMatchCount !== 1 ? "es" : ""}`
                : ""}
              {showWarningsOnly ? " (filtered)" : ""}
            </span>
            <Filter size={12} className="text-warning" />
          </button>
        </div>
      )}

      {/* Transfer matches filter */}
      {stats.transferMatchCount > 0 && (
        <div className="flex items-center px-1">
          <button
            onClick={() => {
              const nextMatchesOnly = !showMatchesOnly;
              setShowMatchesOnly(nextMatchesOnly);
              if (nextMatchesOnly) {
                setShowWarningsOnly(false);
              }
              setPage(0);
            }}
            className={cn(
              "flex items-center gap-2 bg-transparent border-none cursor-pointer transition-opacity px-0 py-0",
              showMatchesOnly ? "opacity-100" : "opacity-60 hover:opacity-100",
            )}
            title="Filter rows that have transfer link matches"
          >
            <Link2 size={14} className="text-dimmed" />
            <span className="text-sm text-dimmed font-medium hover:underline">
              {stats.transferMatchCount} transfer match{stats.transferMatchCount !== 1 ? "es" : ""}
              {stats.linkedTransferCount > 0
                ? ` · ${stats.linkedTransferCount} link${stats.linkedTransferCount !== 1 ? "s" : ""} enabled`
                : ""}
              {showMatchesOnly ? " (filtered)" : ""}
            </span>
            <Filter size={12} className="text-dimmed" />
          </button>
        </div>
      )}

      {/* Transaction table */}
      {(() => {
        // Filter rows if warnings-only mode is active
        const filteredRows = rows
          .map((row, idx) => ({ row, idx }))
          .filter(({ idx }) => {
            if (showWarningsOnly && !warningsByIndex.has(idx)) {
              return false;
            }
            if (showMatchesOnly && !transferPairCandidatesByIndex.has(idx)) {
              return false;
            }
            return true;
          });

        const selectableRowCount = rows.length - duplicateIndexes.size;
        const allSelectableSelected =
          selectableRowCount > 0 &&
          selectedWithoutDuplicates.size === selectableRowCount;

        const totalPages = Math.max(
          1,
          Math.ceil(filteredRows.length / pageSize),
        );
        const currentPage = Math.min(page, totalPages - 1);
        const start = currentPage * pageSize;
        const end = Math.min(start + pageSize, filteredRows.length);
        const displayRows = filteredRows.slice(start, end);
        const columnCount = 7
          + (hasTime ? 1 : 0)
          + (hasTransactionId ? 1 : 0)
          + (hasCurrency ? 1 : 0);

        return (
          <div className="rounded-(--radius-md) border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="px-3 py-2.5 text-left w-8">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={toggleAll}
                        className="cursor-pointer accent-text"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-dimmed font-medium">
                      Date
                    </th>
                    {hasTime && (
                      <th className="px-3 py-2.5 text-left text-dimmed font-medium">
                        Time
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-left text-dimmed font-medium">
                      Description
                    </th>
                    {hasTransactionId && (
                      <th className="px-3 py-2.5 text-left text-dimmed font-medium">
                        Transaction ID
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-left text-dimmed font-medium">
                      Category
                    </th>
                    <th className="px-3 py-2.5 text-left text-dimmed font-medium">
                      Transfer
                    </th>
                    {hasCurrency && (
                      <th className="px-3 py-2.5 text-left text-dimmed font-medium">
                        Currency
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-right text-dimmed font-medium">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-center text-dimmed font-medium w-10">
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
                    const transferPairCandidate = transferPairCandidatesByIndex.get(idx);
                    const transferDecision = getTransferDecision(idx);
                    const isLinkEnabled = transferDecision === 'link';
                    const isMatchPreviewOpen = expandedMatchRowIndex === idx;

                    return (
                      <Fragment key={idx}>
                        <tr
                          onClick={() => toggleRow(idx)}
                          className={cn(
                            "border-b border-border transition-colors",
                            isSelected
                              ? "hover:bg-secondary/50"
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
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {row.date ? formatDate(row.date) : "—"}
                          </td>
                          {hasTime && (
                            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                              {row.time ? row.time.slice(0, 5) : "—"}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-foreground">
                            <span className="break-words">
                              {row.description || "—"}
                            </span>
                          </td>
                          {hasTransactionId && (
                            <td className="px-3 py-2.5 text-dimmed font-mono whitespace-nowrap">
                              {row.transactionId || "—"}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-dimmed">
                            {row.category || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-dimmed">
                            {transferPairCandidate ? (
                              <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                                <button
                                  type="button"
                                  aria-pressed={isLinkEnabled}
                                  onClick={() => toggleTransferLinkDecision(idx)}
                                  title={isLinkEnabled
                                    ? "Linked on import. Click to keep transactions separate."
                                    : "Keep separate. Click to link this row with the matched transfer."
                                  }
                                  aria-label={isLinkEnabled
                                    ? "Linked on import. Click to keep separate"
                                    : "Keep separate. Click to link"
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-(--radius-sm) border px-2 py-0.5 text-sm transition-colors",
                                    isLinkEnabled
                                      ? "border-transfer/40 bg-transfer/10 text-transfer"
                                      : "border-border bg-transparent text-dimmed hover:text-foreground",
                                  )}
                                >
                                  {isLinkEnabled ? <Link2 size={12} /> : <Link2Off size={12} />}
                                  <span>Link</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleMatchPreview(idx)}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-(--radius-sm) border border-border bg-transparent text-dimmed hover:text-foreground hover:border-dimmed transition-colors"
                                  title={`View matched transaction in ${transferPairCandidate.accountName}`}
                                  aria-label={`View matched transaction in ${transferPairCandidate.accountName}`}
                                >
                                  <Eye size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm text-dimmed">—</span>
                            )}
                          </td>
                          {hasCurrency && (
                            <td className="px-3 py-2.5 text-dimmed">
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

                        {transferPairCandidate && isMatchPreviewOpen && (
                          <tr className="border-b border-border bg-card/40">
                            <td colSpan={columnCount} className="px-3 py-2.5">
                              <div className="rounded-(--radius-sm) border border-border bg-background p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-base text-foreground">Matched transaction</span>
                                  {transferPairCandidate.isAlreadyLinked && (
                                    <span className="text-sm text-warning">Existing link (will overwrite)</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                  <div className="text-sm text-dimmed">
                                    Account: <span className="text-foreground">{transferPairCandidate.accountName}</span>
                                  </div>
                                  <div className="text-sm text-dimmed">
                                    Date: <span className="text-foreground">{formatDate(transferPairCandidate.date)}</span>
                                  </div>
                                  <div className="text-sm text-dimmed">
                                    Time: <span className="text-foreground">{transferPairCandidate.time ? transferPairCandidate.time.slice(0, 5) : "—"}</span>
                                  </div>
                                  <div className="text-sm text-dimmed">
                                    Amount: <span className="text-foreground" style={{ fontFamily: "var(--font-display)" }}>{formatSignedCurrency(transferPairCandidate.amount, transferPairCandidate.currency)}</span>
                                  </div>
                                  <div className="text-sm text-dimmed sm:col-span-2">
                                    Description: <span className="text-foreground">{transferPairCandidate.description || "—"}</span>
                                  </div>
                                  <div className="text-sm text-dimmed sm:col-span-2">
                                    Transaction ID: <span className="text-foreground font-mono">{transferPairCandidate.transactionId || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRows.length > PREVIEW_PAGE_SIZES[0] && (
              <div className="flex items-center justify-between px-3 py-2 text-sm text-dimmed bg-card border-t border-border">
                <div className="flex items-center gap-1.5">
                  <span>Rows</span>
                  <Select value={String(pageSize)} onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(0);
                  }}>
                    <SelectTrigger size="sm" className="w-auto bg-transparent border-border px-1 py-0.5 h-auto text-sm text-muted-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREVIEW_PAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span>
                  {start + 1}–{end} of {filteredRows.length}
                </span>
                <PaginationButtons page={currentPage} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleConfirm}
          disabled={stats.count === 0 || !effectiveAccountId || !hasAccounts}
        >
          Import {stats.count} transaction{stats.count !== 1 ? "s" : ""}
        </Button>
        <Button variant="outline" onClick={onBack}>
          <X size={14} />
          Back
        </Button>
      </div>

      {isCreateAccountModalOpen && (
        <AccountFormModal
          mode="create"
          initialValues={DEFAULT_ACCOUNT_FORM_STATE}
          onCancel={() => setIsCreateAccountModalOpen(false)}
          onSubmit={handleCreateAccount}
        />
      )}
    </div>
  );
}
