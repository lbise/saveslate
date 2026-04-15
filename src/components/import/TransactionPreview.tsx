import { Fragment, useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Link2,
  Link2Off,
  Filter,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useAccounts,
  useAutomationRules,
  useCategories,
  useCreateAccount,
  useCreateAutomationRule,
  useImportAiAssist,
  useTransactions,
  useUpdateAutomationRule,
} from "../../hooks/api";
import { RuleFormModal } from "../rules";
import { normalizeAccountIdentifier } from "../../lib/csv";
import {
  createDefaultRuleFormState,
  resolveRuleFormPrefill,
} from "../../lib/rule-utils";
import { cn, formatDate } from "../../lib/utils";
import { useFormatCurrency } from "../../hooks";
import { Card } from "../ui/Card";
import { PaginationButtons } from "../ui";
import type {
  AutomationRule,
  AutomationRulePrefillDraft,
  CsvImportRowOverride,
  ImportAiSuggestion,
  ParsedRow,
} from "../../types";
import type { RuleFormState } from "../../lib/rule-utils";

interface TransactionPreviewProps {
  rows: ParsedRow[];
  file: File;
  parserId: string;
  onConfirm: (
    selectedRowIndexes: number[],
    accountId: string,
    importName: string,
    transferLinks: Array<{ rowIndex: number; matchedTransactionId: string }>,
    rowOverrides: CsvImportRowOverride[],
  ) => void;
  onBack: () => void;
  detectedIdentifier?: string;
  fileName?: string;
}

const PREVIEW_PAGE_SIZES = [20, 25, 50] as const;
const DUPLICATE_WARNING_TEXT = "Duplicate transaction detected";
const POSSIBLE_MATCH_WARNING_TEXT =
  "Possible existing match (no transaction ID)";
const ALREADY_LINKED_TRANSFER_WARNING_TEXT =
  "Matched transaction already belongs to another transfer pair";
const AI_AUTO_APPLY_CONFIDENCE = 0.85;
const AI_ASSIST_PREVIEW_BATCH_SIZE = 20;

type TransferLinkDecision = "link" | "separate";

interface TransferPairCandidate {
  matchedTransactionId: string;
  accountName: string;
  amount: number;
  currency: string;
  date: string;
  time?: string;
  description: string;
  transactionId?: string;
  isAlreadyLinked: boolean;
}

interface PreviewFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

interface AiAssistProgress {
  completedBatchCount: number;
  totalBatchCount: number;
  completedRowCount: number;
  totalRowCount: number;
}

function PreviewField({ label, value, mono = false }: PreviewFieldProps) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Input
        readOnly
        value={value}
        className={cn("cursor-default", mono && "font-mono")}
      />
    </div>
  );
}

function getDefaultTransferDecision(candidate?: {
  isAlreadyLinked: boolean;
}): TransferLinkDecision {
  return candidate?.isAlreadyLinked ? "separate" : "link";
}

function getParsedRowType(
  row: ParsedRow,
  transferCandidate: TransferPairCandidate | undefined,
  isLinkEnabled: boolean,
): string {
  if (transferCandidate && isLinkEnabled) {
    return "Transfer";
  }

  return row.amount < 0 ? "Expense" : "Income";
}

function getParsedRowCategory(
  row: ParsedRow,
  transferCandidate: TransferPairCandidate | undefined,
  isLinkEnabled: boolean,
): string {
  if (row.category?.trim()) {
    return row.category.trim();
  }

  if (transferCandidate && isLinkEnabled) {
    return "Transfer (applied on import)";
  }

  return "Uncategorized";
}

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

function buildRowOverride(
  rowIndex: number,
  suggestion: ImportAiSuggestion,
): CsvImportRowOverride | null {
  const rowOverride: CsvImportRowOverride = { rowIndex };

  if (suggestion.cleanedDescription) {
    rowOverride.description = suggestion.cleanedDescription;
  }
  if (suggestion.categoryId) {
    rowOverride.categoryId = suggestion.categoryId;
  }

  return rowOverride.description || rowOverride.categoryId ? rowOverride : null;
}

function chunkRowIndexes(rowIndexes: number[], chunkSize: number): number[][] {
  const chunks: number[][] = [];
  for (let offset = 0; offset < rowIndexes.length; offset += chunkSize) {
    chunks.push(rowIndexes.slice(offset, offset + chunkSize));
  }
  return chunks;
}

function getDateDistanceInDays(left: string, right: string): number {
  const leftDate = new Date(`${left}T00:00:00`);
  const rightDate = new Date(`${right}T00:00:00`);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return Number.MAX_SAFE_INTEGER;
  }
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.abs(
    Math.round((leftDate.getTime() - rightDate.getTime()) / dayMs),
  );
}

export function TransactionPreview({
  file,
  parserId,
  rows,
  onConfirm,
  onBack,
  detectedIdentifier,
  fileName,
}: TransactionPreviewProps) {
  const { formatCurrency, formatSignedCurrency } = useFormatCurrency();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories(true);
  const { data: automationRules = [] } = useAutomationRules();
  const createAccountMutation = useCreateAccount();
  const createAutomationRuleMutation = useCreateAutomationRule();
  const updateAutomationRuleMutation = useUpdateAutomationRule();
  const importAiAssistMutation = useImportAiAssist();
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] =
    useState(false);
  const { data: existingTransactionsData } = useTransactions({
    pageSize: 10000,
  });
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
  const [detailRowIndex, setDetailRowIndex] = useState<number | null>(null);
  const [matchDetailRowIndex, setMatchDetailRowIndex] = useState<number | null>(null);
  const [aiSuggestionsByIndex, setAiSuggestionsByIndex] = useState<
    Map<number, ImportAiSuggestion>
  >(new Map());
  const [aiSuggestionContextKey, setAiSuggestionContextKey] = useState<string | null>(null);
  const [acceptedAiSuggestionIndexes, setAcceptedAiSuggestionIndexes] =
    useState<Set<number>>(new Set());
  const [ignoredAiSuggestionIndexes, setIgnoredAiSuggestionIndexes] =
    useState<Set<number>>(new Set());
  const [isRunningAiAssist, setIsRunningAiAssist] = useState(false);
  const [aiAssistProgress, setAiAssistProgress] = useState<AiAssistProgress | null>(null);
  const availableCategories = useMemo(
    () => [...categories].sort((left, right) => left.name.localeCompare(right.name)),
    [categories],
  );
  const defaultRuleCategoryId = availableCategories[0]?.id ?? "";
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [initialRuleForm, setInitialRuleForm] = useState<RuleFormState>(() =>
    createDefaultRuleFormState(defaultRuleCategoryId),
  );
  const categoriesById = useMemo(
    () => new Map(availableCategories.map((category) => [category.id, category])),
    [availableCategories],
  );

  // Find matching account ID based on detected identifier
  const matchedAccountId = useMemo(() => {
    const normalized = normalizeAccountIdentifier(detectedIdentifier);
    if (!normalized) return undefined;

    return accounts.find(
      (acc) => normalizeAccountIdentifier(acc.accountIdentifier) === normalized,
    )?.id;
  }, [accounts, detectedIdentifier]);

  const effectiveAccountId =
    accountId || matchedAccountId || accounts[0]?.id || "";

  const selectedAccountCurrency = useMemo(
    () =>
      accounts.find((acc) => acc.id === effectiveAccountId)?.currency ?? "CHF",
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
    const candidates = new Map<number, TransferPairCandidate>();
    const accountsById = new Map(
      accounts.map((account) => [account.id, account] as const),
    );

    rows.forEach((row, idx) => {
      if (row.errors.length > 0 || duplicateIndexes.has(idx)) {
        return;
      }

      const normalizedTransactionId = normalizeTransactionId(row.transactionId);
      if (!normalizedTransactionId) {
        return;
      }

      const expectedCurrency = row.currency || selectedAccountCurrency;

      const matchingTransactions = existingTransactions.filter(
        (transaction) => {
          if (transaction.accountId === effectiveAccountId) {
            return false;
          }

          const existingTransactionId = normalizeTransactionId(
            transaction.transactionId,
          );
          if (
            !existingTransactionId ||
            existingTransactionId !== normalizedTransactionId
          ) {
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
        },
      );

      if (matchingTransactions.length === 0) {
        return;
      }

      const bestMatch = matchingTransactions.sort(
        (left, right) =>
          getDateDistanceInDays(left.date, row.date) -
          getDateDistanceInDays(right.date, row.date),
      )[0];
      const accountName =
        accountsById.get(bestMatch.accountId)?.name ?? "Unknown account";
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

  const [transferLinkDecisions, setTransferLinkDecisions] = useState<
    Map<number, TransferLinkDecision>
  >(new Map());

  const getTransferDecision = useCallback(
    (rowIndex: number): TransferLinkDecision => {
      const explicitDecision = transferLinkDecisions.get(rowIndex);
      if (explicitDecision) {
        return explicitDecision;
      }

      return getDefaultTransferDecision(
        transferPairCandidatesByIndex.get(rowIndex),
      );
    },
    [transferLinkDecisions, transferPairCandidatesByIndex],
  );

  const toggleTransferLinkDecision = useCallback(
    (rowIndex: number) => {
      const candidate = transferPairCandidatesByIndex.get(rowIndex);
      if (!candidate || candidate.isAlreadyLinked) {
        return;
      }

      setTransferLinkDecisions((previous) => {
        const next = new Map(previous);
        const current =
          next.get(rowIndex) ?? getDefaultTransferDecision(candidate);
        if (current === "link") {
          next.set(rowIndex, "separate");
        } else {
          next.delete(rowIndex);
        }
        return next;
      });
    },
    [transferPairCandidatesByIndex],
  );

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
      if (transferPairCandidatesByIndex.get(idx)?.isAlreadyLinked) {
        rowWarnings.push(ALREADY_LINKED_TRANSFER_WARNING_TEXT);
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
    transferPairCandidatesByIndex,
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

  const rowsSignature = useMemo(
    () => rows.map((row, idx) => (
      `${idx}:${row.transactionId ?? ""}:${row.date}:${row.amount}:${row.description}`
    )).join("\u001f"),
    [rows],
  );
  const currentAiContextKey = `${effectiveAccountId}|${parserId}|${rowsSignature}`;
  const currentAiSuggestionsByIndex = useMemo(
    () => aiSuggestionContextKey === currentAiContextKey ? aiSuggestionsByIndex : new Map<number, ImportAiSuggestion>(),
    [aiSuggestionContextKey, aiSuggestionsByIndex, currentAiContextKey],
  );

  const aiEligibleRowIndexes = useMemo(
    () => rows
      .map((_, idx) => idx)
      .filter((idx) => {
        if (rows[idx]?.errors.length) {
          return false;
        }
        if (duplicateIndexes.has(idx)) {
          return false;
        }
        if (transferPairCandidatesByIndex.has(idx)) {
          return false;
        }
        return true;
      }),
    [duplicateIndexes, rows, transferPairCandidatesByIndex],
  );

  const acceptedAiSuggestions = useMemo(() => {
    const next = new Set<number>();
    acceptedAiSuggestionIndexes.forEach((idx) => {
      if (currentAiSuggestionsByIndex.has(idx)) {
        next.add(idx);
      }
    });
    return next;
  }, [acceptedAiSuggestionIndexes, currentAiSuggestionsByIndex]);

  const ignoredAiSuggestions = useMemo(() => {
    const next = new Set<number>();
    ignoredAiSuggestionIndexes.forEach((idx) => {
      if (currentAiSuggestionsByIndex.has(idx)) {
        next.add(idx);
      }
    });
    return next;
  }, [currentAiSuggestionsByIndex, ignoredAiSuggestionIndexes]);

  const aiSuggestionCount = currentAiSuggestionsByIndex.size;
  const acceptedAiSuggestionCount = acceptedAiSuggestions.size;
  const pendingReviewAiSuggestionCount = useMemo(
    () => Array.from(currentAiSuggestionsByIndex.keys()).filter(
      (idx) => !acceptedAiSuggestions.has(idx) && !ignoredAiSuggestions.has(idx),
    ).length,
    [acceptedAiSuggestions, currentAiSuggestionsByIndex, ignoredAiSuggestions],
  );
  const pendingHighConfidenceSuggestionCount = useMemo(
    () => Array.from(currentAiSuggestionsByIndex.entries()).filter(([idx, suggestion]) => (
      suggestion.confidence >= AI_AUTO_APPLY_CONFIDENCE
      && !acceptedAiSuggestions.has(idx)
    )).length,
    [acceptedAiSuggestions, currentAiSuggestionsByIndex],
  );
  const aiAssistProgressLabel = useMemo(() => {
    if (!aiAssistProgress) {
      return null;
    }

    return `${aiAssistProgress.completedRowCount}/${aiAssistProgress.totalRowCount} rows`;
  }, [aiAssistProgress]);

  const acceptAiSuggestion = useCallback((rowIndex: number) => {
    setAcceptedAiSuggestionIndexes((previous) => new Set(previous).add(rowIndex));
    setIgnoredAiSuggestionIndexes((previous) => {
      const next = new Set(previous);
      next.delete(rowIndex);
      return next;
    });
  }, []);

  const ignoreAiSuggestion = useCallback((rowIndex: number) => {
    setAcceptedAiSuggestionIndexes((previous) => {
      const next = new Set(previous);
      next.delete(rowIndex);
      return next;
    });
    setIgnoredAiSuggestionIndexes((previous) => new Set(previous).add(rowIndex));
  }, []);

  const acceptAllHighConfidenceSuggestions = useCallback(() => {
    setAcceptedAiSuggestionIndexes((previous) => {
      const next = new Set(previous);
      currentAiSuggestionsByIndex.forEach((suggestion, rowIndex) => {
        if (suggestion.confidence >= AI_AUTO_APPLY_CONFIDENCE) {
          next.add(rowIndex);
        }
      });
      return next;
    });
    setIgnoredAiSuggestionIndexes((previous) => {
      const next = new Set(previous);
      currentAiSuggestionsByIndex.forEach((suggestion, rowIndex) => {
        if (suggestion.confidence >= AI_AUTO_APPLY_CONFIDENCE) {
          next.delete(rowIndex);
        }
      });
      return next;
    });
  }, [currentAiSuggestionsByIndex]);

  const closeRuleModal = useCallback(() => {
    setIsRuleModalOpen(false);
    setEditingRuleId(null);
  }, []);

  const handleSaveRule = useCallback((ruleData: {
    name: string;
    isEnabled: boolean;
    triggers: AutomationRule["triggers"];
    matchMode: AutomationRule["matchMode"];
    conditions: AutomationRule["conditions"];
    actions: AutomationRule["actions"];
  }) => {
    if (editingRuleId) {
      updateAutomationRuleMutation.mutate(
        { id: editingRuleId, ...ruleData },
        {
          onSuccess: () => {
            closeRuleModal();
            toast.success("Rule updated");
          },
          onError: () => toast.error("Failed to update rule"),
        },
      );
      return;
    }

    createAutomationRuleMutation.mutate(ruleData, {
      onSuccess: () => {
        closeRuleModal();
        toast.success("Rule created");
      },
      onError: () => toast.error("Failed to create rule"),
    });
  }, [closeRuleModal, createAutomationRuleMutation, editingRuleId, updateAutomationRuleMutation]);

  const openCreateRuleModal = useCallback((rowIndex: number) => {
    const suggestion = currentAiSuggestionsByIndex.get(rowIndex);
    if (!suggestion?.categoryId || !suggestion.ruleKeyword) {
      return;
    }
    if (!defaultRuleCategoryId) {
      toast.info("Add at least one visible category before creating a rule.");
      return;
    }

    const categoryName = suggestion.categoryName
      ?? categoriesById.get(suggestion.categoryId)?.name
      ?? "AI category";
    const prefillDraft: AutomationRulePrefillDraft = {
      name: categoryName,
      categoryId: suggestion.categoryId,
      isEnabled: true,
      triggers: ["on-import", "manual-run"],
      matchMode: "all",
      applyToUncategorizedOnly: true,
      mergeIntoExistingCategoryRule: true,
      conditions: [
        {
          field: "description",
          operator: "contains",
          value: suggestion.ruleKeyword,
        },
      ],
    };

    const { initialForm, editingRuleId: resolvedEditingRuleId } =
      resolveRuleFormPrefill({
        prefill: prefillDraft,
        rules: automationRules,
        defaultCategoryId: defaultRuleCategoryId,
      });

    setInitialRuleForm(initialForm);
    setEditingRuleId(resolvedEditingRuleId);
    setIsRuleModalOpen(true);
  }, [automationRules, categoriesById, currentAiSuggestionsByIndex, defaultRuleCategoryId]);

  const handleRunAiAssist = useCallback(async () => {
    if (!effectiveAccountId) {
      toast.error("Select an account before running AI assist.");
      return;
    }
    if (aiEligibleRowIndexes.length === 0) {
      toast.info("No eligible rows available for AI suggestions.");
      return;
    }

    const rowIndexBatches = chunkRowIndexes(
      aiEligibleRowIndexes,
      AI_ASSIST_PREVIEW_BATCH_SIZE,
    );
    let completedBatchCount = 0;
    let completedRowCount = 0;
    let totalSuggestionCount = 0;
    let totalAutoAcceptedCount = 0;

    setIsRunningAiAssist(true);
    setAiSuggestionContextKey(currentAiContextKey);
    setAiSuggestionsByIndex(new Map());
    setAcceptedAiSuggestionIndexes(new Set());
    setIgnoredAiSuggestionIndexes(new Set());
    setAiAssistProgress({
      completedBatchCount: 0,
      totalBatchCount: rowIndexBatches.length,
      completedRowCount: 0,
      totalRowCount: aiEligibleRowIndexes.length,
    });

    try {
      for (const rowIndexes of rowIndexBatches) {
        const result = await importAiAssistMutation.mutateAsync({
          file,
          accountId: effectiveAccountId,
          parserId,
          rowIndexes,
        });

        completedBatchCount += 1;
        completedRowCount += rowIndexes.length;
        totalSuggestionCount += result.suggestions.length;
        totalAutoAcceptedCount += result.suggestions.filter(
          (suggestion) => suggestion.confidence >= AI_AUTO_APPLY_CONFIDENCE,
        ).length;

        setAiSuggestionsByIndex((previous) => {
          const next = new Map(previous);
          result.suggestions.forEach((suggestion) => {
            next.set(suggestion.rowIndex, suggestion);
          });
          return next;
        });
        setAcceptedAiSuggestionIndexes((previous) => {
          const next = new Set(previous);
          result.suggestions.forEach((suggestion) => {
            if (suggestion.confidence >= AI_AUTO_APPLY_CONFIDENCE) {
              next.add(suggestion.rowIndex);
            }
          });
          return next;
        });
        setAiAssistProgress({
          completedBatchCount,
          totalBatchCount: rowIndexBatches.length,
          completedRowCount,
          totalRowCount: aiEligibleRowIndexes.length,
        });
      }

      if (totalSuggestionCount === 0) {
        toast.success("AI checked the selected rows and found no useful suggestions.");
        return;
      }

      toast.success(
        `${totalSuggestionCount} AI suggestion${totalSuggestionCount !== 1 ? "s" : ""} ready${totalAutoAcceptedCount > 0 ? `, ${totalAutoAcceptedCount} auto-applied` : ""}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run AI assist";
      if (completedBatchCount > 0) {
        toast.error(
          `${message} Processed ${completedBatchCount}/${rowIndexBatches.length} batches before stopping.`,
        );
      } else {
        toast.error(message);
      }
    } finally {
      setIsRunningAiAssist(false);
      setAiAssistProgress((previous) => {
        if (!previous) {
          return null;
        }

        return {
          ...previous,
          completedBatchCount,
          completedRowCount,
        };
      });
    }
  }, [aiEligibleRowIndexes, currentAiContextKey, effectiveAccountId, file, importAiAssistMutation, parserId]);

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
    const linkedTransferCount = Array.from(
      transferPairCandidatesByIndex.keys(),
    ).filter((idx) => getTransferDecision(idx) === "link").length;

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
      .filter((rowIndex) => getTransferDecision(rowIndex) === "link")
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
      .filter(
        (entry): entry is { rowIndex: number; matchedTransactionId: string } =>
          entry !== null,
      );
    const rowOverrides = selectedRowIndexes
      .filter((rowIndex) => acceptedAiSuggestions.has(rowIndex))
      .map((rowIndex) => {
        const suggestion = currentAiSuggestionsByIndex.get(rowIndex);
        return suggestion ? buildRowOverride(rowIndex, suggestion) : null;
      })
      .filter((rowOverride): rowOverride is CsvImportRowOverride => rowOverride !== null);

    onConfirm(
      selectedRowIndexes,
      effectiveAccountId,
      importName,
      transferLinks,
      rowOverrides,
    );
  };

  const handleCreateAccount = async (
    accountPayload: AccountFormSubmitPayload,
  ) => {
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

  const selectedAccount = accounts.find(
    (account) => account.id === effectiveAccountId,
  );
  const detailRow = detailRowIndex !== null ? rows[detailRowIndex] : null;
  const detailAiSuggestion =
    detailRowIndex !== null ? currentAiSuggestionsByIndex.get(detailRowIndex) : undefined;
  const detailAiSuggestionAccepted =
    detailRowIndex !== null && acceptedAiSuggestions.has(detailRowIndex);
  const detailWarnings =
    detailRowIndex !== null ? (warningsByIndex.get(detailRowIndex) ?? []) : [];
  const detailTransferPairCandidate =
    detailRowIndex !== null
      ? transferPairCandidatesByIndex.get(detailRowIndex)
      : undefined;
  const detailIsLinkEnabled =
    detailRowIndex !== null
      ? getTransferDecision(detailRowIndex) === "link"
      : false;
  const detailRawEntries = detailRow ? Object.entries(detailRow.raw) : [];
  const detailMetadata = detailRow?.metadata ?? [];
  const matchDetailTransferPairCandidate =
    matchDetailRowIndex !== null
      ? transferPairCandidatesByIndex.get(matchDetailRowIndex)
      : undefined;

  const handleTransferDecisionToggle = useCallback((rowIndex: number) => {
    toggleTransferLinkDecision(rowIndex);
  }, [toggleTransferLinkDecision]);

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
              <Select
                value={effectiveAccountId}
                onValueChange={(value) => setAccountId(value)}
              >
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
                No accounts yet. Create an account to choose where these
                transactions will be imported.
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

      <Card className="p-3 space-y-3 border-primary/20 bg-primary/[0.04]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">AI assist</Badge>
              {aiAssistProgress && (
                <>
                  <Badge variant="outline">
                    Batch {Math.min(aiAssistProgress.completedBatchCount, aiAssistProgress.totalBatchCount)}/{aiAssistProgress.totalBatchCount}
                  </Badge>
                  {aiAssistProgressLabel && (
                    <Badge variant="outline">{aiAssistProgressLabel}</Badge>
                  )}
                </>
              )}
              {aiSuggestionCount > 0 && (
                <>
                  <Badge variant="outline">
                    {aiSuggestionCount} suggestion{aiSuggestionCount !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline">
                    {acceptedAiSuggestionCount} accepted
                  </Badge>
                  {pendingReviewAiSuggestionCount > 0 && (
                    <Badge variant="muted">
                      {pendingReviewAiSuggestionCount} need review
                    </Badge>
                  )}
                </>
              )}
            </div>
            <p className="text-sm text-dimmed">
              Suggests cleaner descriptions and categories for uncategorized rows.
              Accepted suggestions only affect this import.
              {isRunningAiAssist && " Suggestions appear as each batch finishes."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pendingHighConfidenceSuggestionCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={acceptAllHighConfidenceSuggestions}
                disabled={isRunningAiAssist}
              >
                Accept all high-confidence
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunAiAssist}
              disabled={!effectiveAccountId || aiEligibleRowIndexes.length === 0 || isRunningAiAssist}
            >
              {isRunningAiAssist ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isRunningAiAssist
                ? `Running AI assist${aiAssistProgress ? ` (${Math.min(aiAssistProgress.completedBatchCount + 1, aiAssistProgress.totalBatchCount)}/${aiAssistProgress.totalBatchCount})` : "..."}`
                : "Run AI assist"}
            </Button>
          </div>
        </div>
      </Card>

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
              {stats.transferMatchCount} transfer match
              {stats.transferMatchCount !== 1 ? "es" : ""}
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
                      Description
                    </th>
                    <th className="px-3 py-2.5 text-right text-dimmed font-medium">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-right text-dimmed font-medium">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map(({ row, idx }) => {
                    const isSelected = selectedIndexes.has(idx);
                    const isDuplicate = duplicateIndexes.has(idx);
                    const aiSuggestion = currentAiSuggestionsByIndex.get(idx);
                    const aiSuggestionAccepted = acceptedAiSuggestions.has(idx);
                    const aiSuggestionIgnored = ignoredAiSuggestions.has(idx);
                    const rowWarnings = warningsByIndex.get(idx) ?? [];
                    const hasWarnings = rowWarnings.length > 0;
                    const transferPairCandidate =
                      transferPairCandidatesByIndex.get(idx);
                    const transferDecision = getTransferDecision(idx);
                    const isLinkEnabled = transferDecision === "link";
                    const hasAiSuggestion = Boolean(aiSuggestion);
                    const hasTransferInfo = Boolean(transferPairCandidate);
                    const hasSubrows = hasWarnings || hasAiSuggestion || hasTransferInfo;

                    return (
                      <Fragment key={idx}>
                        <tr
                          onClick={() => toggleRow(idx)}
                          className={cn(
                            hasSubrows
                              ? "transition-colors"
                              : "border-b border-border transition-colors",
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
                          <td className="px-3 py-2.5 text-foreground">
                            <p className="break-words font-medium text-foreground">
                              {row.description || "—"}
                            </p>
                          </td>
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
                          <td className="px-3 py-2.5 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              title="View transaction details"
                              aria-label="View transaction details"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDetailRowIndex(idx);
                              }}
                            >
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>

                        {hasWarnings && (
                          <tr className={cn(
                            "bg-warning/[0.04]",
                            hasAiSuggestion || hasTransferInfo ? "" : "border-b border-border",
                          )}>
                            <td colSpan={4} className="px-3 py-3">
                              <div className="space-y-2">
                                {rowWarnings.map((warning, warningIndex) => (
                                  <div
                                    key={`${idx}-${warningIndex}`}
                                    className="flex items-start gap-2 text-sm text-warning"
                                  >
                                    <AlertTriangle
                                      size={14}
                                      className="mt-0.5 shrink-0"
                                    />
                                    <span>{warning}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}

                        {aiSuggestion && (
                          <tr className={cn(
                            "bg-primary/[0.04]",
                            hasTransferInfo ? "" : "border-b border-border",
                          )}>
                            <td colSpan={4} className="px-3 py-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="default">AI suggestion</Badge>
                                    <Badge variant="outline">
                                      {Math.round(aiSuggestion.confidence * 100)}% confidence
                                    </Badge>
                                    {aiSuggestionAccepted && (
                                      <Badge variant="outline">Accepted</Badge>
                                    )}
                                    {aiSuggestionIgnored && (
                                      <Badge variant="muted">Ignored</Badge>
                                    )}
                                  </div>

                                  <div className="space-y-1 text-sm text-foreground">
                                    {aiSuggestion.cleanedDescription && (
                                      <p>
                                        <span className="text-dimmed">Description:</span>{" "}
                                        {aiSuggestion.cleanedDescription}
                                      </p>
                                    )}
                                    {aiSuggestion.categoryId && (
                                      <p>
                                        <span className="text-dimmed">Category:</span>{" "}
                                        {aiSuggestion.categoryName
                                          ?? categoriesById.get(aiSuggestion.categoryId)?.name
                                          ?? "Unknown category"}
                                      </p>
                                    )}
                                    <p className="text-dimmed">
                                      {aiSuggestion.reason || "Suggested from similar transactions."}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant={aiSuggestionAccepted ? "default" : "outline"}
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      acceptAiSuggestion(idx);
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={aiSuggestionIgnored ? "default" : "ghost"}
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      ignoreAiSuggestion(idx);
                                    }}
                                  >
                                    Ignore
                                  </Button>
                                  {aiSuggestionAccepted && aiSuggestion.categoryId && aiSuggestion.ruleKeyword && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openCreateRuleModal(idx);
                                      }}
                                    >
                                      Create rule
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {transferPairCandidate && (
                          <tr className="border-b border-border bg-transfer/[0.05]">
                            <td colSpan={4} className="px-3 py-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-1">
                                  <p className="text-sm text-foreground">
                                    Matched with an existing transaction in {transferPairCandidate.accountName}.
                                  </p>
                                  <p className="text-sm text-dimmed">
                                    {transferPairCandidate.isAlreadyLinked
                                      ? "This matched transaction is already linked elsewhere, so this row will stay separate."
                                      : isLinkEnabled
                                        ? "This row will be linked as a transfer on import."
                                        : "This row will be imported separately."}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {!transferPairCandidate.isAlreadyLinked && (
                                    <Button
                                      type="button"
                                      variant={isLinkEnabled ? "default" : "outline"}
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleTransferDecisionToggle(idx);
                                      }}
                                    >
                                      {isLinkEnabled ? <Link2 size={14} /> : <Link2Off size={14} />}
                                      {isLinkEnabled ? "Linked on import" : "Keep separate"}
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setMatchDetailRowIndex(idx);
                                    }}
                                  >
                                    Show match
                                  </Button>
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
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(0);
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-auto bg-transparent border-border px-1 py-0.5 h-auto text-sm text-muted-foreground"
                    >
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
                <PaginationButtons
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        );
      })()}

      {detailRow && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setDetailRowIndex(null);
          }}
        >
          <DialogContent className="max-w-3xl" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              {detailWarnings.length > 0 && (
                <Card className="border-warning/30 bg-warning/[0.06] p-3 space-y-2">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle size={16} />
                    <span className="text-base text-foreground">Warnings</span>
                  </div>
                  {detailWarnings.map((warning, warningIndex) => (
                    <div
                      key={`detail-warning-${warningIndex}`}
                      className="flex items-start gap-2 text-sm text-warning"
                    >
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PreviewField
                  label="Description"
                  value={detailRow.description || "—"}
                />
                <PreviewField
                  label="Transaction reference"
                  value={detailRow.transactionId || "—"}
                  mono
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PreviewField
                  label="Type"
                  value={getParsedRowType(
                    detailRow,
                    detailTransferPairCandidate,
                    detailIsLinkEnabled,
                  )}
                />
                <PreviewField
                  label="Amount"
                  value={formatSignedCurrency(
                    detailRow.amount,
                    detailRow.currency || selectedAccountCurrency,
                  )}
                />
                <PreviewField
                  label="Currency"
                  value={detailRow.currency || selectedAccountCurrency}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PreviewField
                  label="Date"
                  value={detailRow.date ? formatDate(detailRow.date) : "—"}
                />
                <PreviewField
                  label="Time"
                  value={detailRow.time ? detailRow.time.slice(0, 5) : "—"}
                />
                <PreviewField
                  label="Account"
                  value={
                    selectedAccount
                      ? `${selectedAccount.name} (${selectedAccount.currency})`
                      : "—"
                  }
                />
              </div>

              <PreviewField
                label="Category"
                value={getParsedRowCategory(
                  detailRow,
                  detailTransferPairCandidate,
                  detailIsLinkEnabled,
                )}
              />

              {detailAiSuggestion && (
                <Card className="p-3 space-y-3 border-primary/20 bg-primary/[0.04]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">AI suggestion</Badge>
                    <Badge variant="outline">
                      {Math.round(detailAiSuggestion.confidence * 100)}% confidence
                    </Badge>
                    {detailAiSuggestionAccepted && (
                      <Badge variant="outline">Accepted for import</Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-foreground">
                    {detailAiSuggestion.cleanedDescription && (
                      <p>
                        <span className="text-dimmed">Suggested description:</span>{" "}
                        {detailAiSuggestion.cleanedDescription}
                      </p>
                    )}
                    {detailAiSuggestion.categoryId && (
                      <p>
                        <span className="text-dimmed">Suggested category:</span>{" "}
                        {detailAiSuggestion.categoryName
                          ?? categoriesById.get(detailAiSuggestion.categoryId)?.name
                          ?? "Unknown category"}
                      </p>
                    )}
                    <p className="text-dimmed">
                      {detailAiSuggestion.reason || "Suggested from similar transactions."}
                    </p>
                  </div>
                </Card>
              )}

              {detailMetadata.length > 0 && (
                <Card className="p-3 space-y-3">
                  <div>
                    <h3 className="text-base text-foreground">
                      Imported metadata
                    </h3>
                    <p className="text-sm text-dimmed">
                      Metadata extracted by the parser for this row.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detailMetadata.map((entry, metadataIndex) => (
                      <div
                        key={`${entry.key}-${metadataIndex}`}
                        className="rounded-(--radius-sm) border border-border p-3"
                      >
                        <p className="text-sm text-dimmed">{entry.key}</p>
                        <p className="mt-1 text-sm text-foreground break-words">
                          {entry.value || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {detailRawEntries.length > 0 && (
                <Card className="p-3 space-y-3">
                  <div>
                    <h3 className="text-base text-foreground">
                      Raw import fields
                    </h3>
                    <p className="text-sm text-dimmed">
                      Original values from the CSV row before import.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detailRawEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-(--radius-sm) border border-border p-3"
                      >
                        <p className="text-sm text-dimmed break-all">{key}</p>
                        <p className="mt-1 text-sm text-foreground break-words">
                          {value || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDetailRowIndex(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {matchDetailTransferPairCandidate && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setMatchDetailRowIndex(null);
          }}
        >
          <DialogContent className="max-w-2xl" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Matched Transaction</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="p-3 space-y-2">
                <p className="text-sm text-foreground">
                  Matched against an existing transaction in {matchDetailTransferPairCandidate.accountName}.
                </p>
                <p className={cn(
                  "text-sm",
                  matchDetailTransferPairCandidate.isAlreadyLinked ? "text-warning" : "text-dimmed",
                )}>
                  {matchDetailTransferPairCandidate.isAlreadyLinked
                    ? "This matched transaction is already linked elsewhere."
                    : "This matched transaction can be linked on import."}
                </p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PreviewField label="Matched account" value={matchDetailTransferPairCandidate.accountName} />
                <PreviewField
                  label="Matched amount"
                  value={formatSignedCurrency(
                    matchDetailTransferPairCandidate.amount,
                    matchDetailTransferPairCandidate.currency,
                  )}
                />
                <PreviewField
                  label="Matched date"
                  value={formatDate(matchDetailTransferPairCandidate.date)}
                />
                <PreviewField
                  label="Matched time"
                  value={matchDetailTransferPairCandidate.time ? matchDetailTransferPairCandidate.time.slice(0, 5) : "—"}
                />
                <PreviewField
                  label="Matched description"
                  value={matchDetailTransferPairCandidate.description || "—"}
                />
                <PreviewField
                  label="Matched transaction reference"
                  value={matchDetailTransferPairCandidate.transactionId || "—"}
                  mono
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMatchDetailRowIndex(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleConfirm}
          disabled={stats.count === 0 || !effectiveAccountId || !hasAccounts || isRunningAiAssist}
        >
          Import {stats.count} transaction{stats.count !== 1 ? "s" : ""}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={isRunningAiAssist}>
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

      {isRuleModalOpen && (
        <RuleFormModal
          editingRuleId={editingRuleId}
          initialForm={initialRuleForm}
          defaultCategoryId={defaultRuleCategoryId}
          categories={availableCategories}
          onClose={closeRuleModal}
          onSave={handleSaveRule}
        />
      )}
    </div>
  );
}
