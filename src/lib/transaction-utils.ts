import type { Transaction, TransactionType } from "../types";

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
