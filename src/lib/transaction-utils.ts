import { getCategoryById, getAccountById, getGoalById } from "./data-service";
import { loadTransactions, saveTransactions } from "./transaction-storage";
import { inferTransactionType, UNCATEGORIZED_CATEGORY_ID } from "./transaction-type";
import type { Transaction, TransactionType, TransactionWithDetails } from "../types";

const amountColors: Record<TransactionType, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-foreground",
};

export function getAmountColorClass(type: TransactionType, amount: number): string {
  if (type !== "transfer") {
    return amountColors[type];
  }
  if (amount > 0) {
    return "text-income";
  }
  if (amount < 0) {
    return "text-expense";
  }
  return "text-foreground";
}

export const iconBoxStyles: Record<TransactionType, string> = {
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  transfer: "bg-transfer/10 text-transfer",
};

export const UNCATEGORIZED_ICON_STYLE = "bg-warning/10 text-warning";

export function parseFilterIdsFromQuery(searchParams: URLSearchParams, key: string): string[] {
  const values = searchParams
    .getAll(key)
    .flatMap((rawValue) => rawValue.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(values));
}

export function parseTypeFilterFromQuery(searchParams: URLSearchParams): TransactionType | "all" {
  const rawType = searchParams.get("type");
  if (rawType === "income" || rawType === "expense" || rawType === "transfer") {
    return rawType;
  }

  return "all";
}

export function createTransferCounterpartyMap(transactions: Transaction[]): Map<string, string> {
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

export function toTransactionWithDetails(
  transaction: Transaction,
  counterpartyByTransactionId: Map<string, string>,
): TransactionWithDetails {
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

export function loadTransactionsWithDetails(): TransactionWithDetails[] {
  const transactions = loadTransactions();
  const counterpartyByTransactionId = createTransferCounterpartyMap(transactions);
  return transactions.map((transaction) => toTransactionWithDetails(transaction, counterpartyByTransactionId));
}

export function toStoredTransaction(transaction: TransactionWithDetails): Transaction {
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

export function persistTransactions(transactions: TransactionWithDetails[]): TransactionWithDetails[] {
  saveTransactions(transactions.map((transaction) => toStoredTransaction(transaction)));
  return loadTransactionsWithDetails();
}
