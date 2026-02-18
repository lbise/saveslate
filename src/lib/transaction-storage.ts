import type { Transaction, ImportBatch } from '../types';

const TRANSACTIONS_KEY = 'melomoney:transactions';
const BATCHES_KEY = 'melomoney:import-batches';
const LEGACY_MOCK_ID_PATTERN = /^t\d+$/;

function isLegacyMockTransaction(transaction: Transaction): boolean {
  return (
    LEGACY_MOCK_ID_PATTERN.test(transaction.id)
    && !transaction.importBatchId
    && !transaction.rawData
  );
}

// ─── Transactions ─────────────────────────────────────────────

/**
 * Load transactions from localStorage.
 * Returns an empty list on first load.
 */
export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const transactions = parsed as Transaction[];
    const cleaned = transactions.filter((transaction) => !isLegacyMockTransaction(transaction));

    if (cleaned.length !== transactions.length) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Replace all transactions in localStorage.
 */
export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

/**
 * Append new transactions and persist. Returns the full updated list.
 */
export function addTransactions(newTransactions: Transaction[]): Transaction[] {
  const existing = loadTransactions();
  const updated = [...existing, ...newTransactions];
  saveTransactions(updated);
  return updated;
}

// ─── Import Batches ───────────────────────────────────────────

/**
 * Load all import batches from localStorage.
 */
export function loadImportBatches(): ImportBatch[] {
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ImportBatch[];
  } catch {
    return [];
  }
}

/**
 * Save a new import batch. Generates an id and persists.
 */
export function saveImportBatch(batch: Omit<ImportBatch, 'id'>): ImportBatch {
  const batches = loadImportBatches();
  const newBatch: ImportBatch = {
    ...batch,
    id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  batches.push(newBatch);
  localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
  return newBatch;
}

/**
 * Rename an import batch. Empty names clear the custom name.
 */
export function renameImportBatch(batchId: string, name: string): ImportBatch | null {
  const batches = loadImportBatches();
  const normalizedName = name.trim();
  let renamedBatch: ImportBatch | null = null;

  const updatedBatches = batches.map((batch) => {
    if (batch.id !== batchId) {
      return batch;
    }

    renamedBatch = {
      ...batch,
      name: normalizedName || undefined,
    };
    return renamedBatch;
  });

  if (!renamedBatch) {
    return null;
  }

  localStorage.setItem(BATCHES_KEY, JSON.stringify(updatedBatches));
  return renamedBatch;
}

/**
 * Delete an import batch and all transactions linked to it.
 */
export function deleteImportBatch(batchId: string): {
  deletedBatch: ImportBatch | null;
  deletedTransactions: number;
} {
  const batches = loadImportBatches();
  const deletedBatch = batches.find((batch) => batch.id === batchId) ?? null;

  if (!deletedBatch) {
    return {
      deletedBatch: null,
      deletedTransactions: 0,
    };
  }

  const remainingBatches = batches.filter((batch) => batch.id !== batchId);
  localStorage.setItem(BATCHES_KEY, JSON.stringify(remainingBatches));

  const transactions = loadTransactions();
  const remainingTransactions = transactions.filter(
    (transaction) => transaction.importBatchId !== batchId,
  );
  const deletedTransactions = transactions.length - remainingTransactions.length;
  saveTransactions(remainingTransactions);

  return {
    deletedBatch,
    deletedTransactions,
  };
}

/**
 * Remove batches that no longer have any linked transactions.
 */
export function pruneEmptyImportBatches(): number {
  const batches = loadImportBatches();
  if (batches.length === 0) return 0;

  const transactions = loadTransactions();
  const usedBatchIds = new Set<string>();
  transactions.forEach((transaction) => {
    if (transaction.importBatchId) {
      usedBatchIds.add(transaction.importBatchId);
    }
  });

  const remainingBatches = batches.filter((batch) => usedBatchIds.has(batch.id));
  const removedCount = batches.length - remainingBatches.length;

  if (removedCount > 0) {
    localStorage.setItem(BATCHES_KEY, JSON.stringify(remainingBatches));
  }

  return removedCount;
}
