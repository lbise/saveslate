import { TRANSACTIONS } from '../data/mock/transactions';
import type { Transaction, ImportBatch } from '../types';

const TRANSACTIONS_KEY = 'melomoney:transactions';
const BATCHES_KEY = 'melomoney:import-batches';

// ─── Transactions ─────────────────────────────────────────────

/**
 * Load transactions from localStorage.
 * Falls back to mock data on first load (seeds localStorage).
 */
export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (raw) return JSON.parse(raw) as Transaction[];

    // First load: seed with mock data (which now includes currency)
    const seeded = TRANSACTIONS.map((t) => ({ ...t }));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return [...TRANSACTIONS];
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
