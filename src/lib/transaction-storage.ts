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
