import { readStorageWithLegacy } from './storage-migration';
import type { Transaction, ImportBatch } from '../types';

const TRANSACTIONS_KEY = 'saveslate:transactions';
const LEGACY_TRANSACTIONS_KEY = 'melomoney:transactions';
const BATCHES_KEY = 'saveslate:import-batches';
const LEGACY_BATCHES_KEY = 'melomoney:import-batches';
const LEGACY_MOCK_ID_PATTERN = /^t\d+$/;

function normalizeTagIds(tagIds: unknown): string[] | undefined {
  if (!Array.isArray(tagIds)) {
    return undefined;
  }

  const normalized = Array.from(
    new Set(
      tagIds
        .filter((tagId): tagId is string => typeof tagId === 'string')
        .map((tagId) => tagId.trim())
        .filter((tagId) => tagId.length > 0),
    ),
  );

  return normalized.length > 0 ? normalized : undefined;
}

function areTagIdListsEqual(left: string[] | undefined, right: string[] | undefined): boolean {
  if (left === undefined && right === undefined) {
    return true;
  }
  if (left === undefined || right === undefined) {
    return false;
  }
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function normalizeTransactionTags(transactions: Transaction[]): Transaction[] {
  if (transactions.length === 0) {
    return transactions;
  }

  return transactions.map((transaction) => {
    const currentTagIds = Array.isArray(transaction.tagIds)
      ? transaction.tagIds
      : undefined;
    const nextTagIds = normalizeTagIds(transaction.tagIds);

    if (areTagIdListsEqual(currentTagIds, nextTagIds)) {
      return transaction;
    }

    if (!nextTagIds) {
      return {
        ...transaction,
        tagIds: undefined,
      };
    }

    return {
      ...transaction,
      tagIds: nextTagIds,
    };
  });
}

function normalizeTransferPairs(transactions: Transaction[]): Transaction[] {
  if (transactions.length === 0) {
    return transactions;
  }

  const normalized = transactions.map((transaction) => {
    const nextPairId = transaction.transferPairId?.trim();
    const hasPairId = Boolean(nextPairId);

    if (!hasPairId) {
      if (transaction.transferPairRole !== undefined) {
        return {
          ...transaction,
          transferPairRole: undefined,
        };
      }
      return transaction;
    }

    if (nextPairId !== transaction.transferPairId) {
      return {
        ...transaction,
        transferPairId: nextPairId,
      };
    }

    return transaction;
  });

  const indexesByPairId = new Map<string, number[]>();
  normalized.forEach((transaction, index) => {
    if (!transaction.transferPairId) {
      return;
    }
    const existing = indexesByPairId.get(transaction.transferPairId) ?? [];
    existing.push(index);
    indexesByPairId.set(transaction.transferPairId, existing);
  });

  for (const [, indexes] of indexesByPairId) {
    if (indexes.length !== 2) {
      indexes.forEach((index) => {
        const transaction = normalized[index];
        normalized[index] = {
          ...transaction,
          transferPairId: undefined,
          transferPairRole: undefined,
        };
      });
      continue;
    }

    const [leftIndex, rightIndex] = indexes;
    const left = normalized[leftIndex];
    const right = normalized[rightIndex];

    const hasOppositeSigns = (left.amount < 0 && right.amount > 0)
      || (left.amount > 0 && right.amount < 0);

    if (hasOppositeSigns) {
      normalized[leftIndex] = {
        ...left,
        transferPairRole: left.amount < 0 ? 'source' : 'destination',
      };
      normalized[rightIndex] = {
        ...right,
        transferPairRole: right.amount < 0 ? 'source' : 'destination',
      };
      continue;
    }

    normalized[leftIndex] = {
      ...left,
      transferPairRole: 'source',
    };
    normalized[rightIndex] = {
      ...right,
      transferPairRole: 'destination',
    };
  }

  return normalized;
}

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
    const raw = readStorageWithLegacy(TRANSACTIONS_KEY, LEGACY_TRANSACTIONS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const transactions = parsed as Transaction[];
    const cleaned = transactions.filter((transaction) => !isLegacyMockTransaction(transaction));
    const normalizedTags = normalizeTransactionTags(cleaned);
    const normalized = normalizeTransferPairs(normalizedTags);

    if (JSON.stringify(normalized) !== JSON.stringify(transactions)) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

/**
 * Replace all transactions in localStorage.
 */
export function saveTransactions(transactions: Transaction[]): void {
  const normalizedTags = normalizeTransactionTags(transactions);
  const normalized = normalizeTransferPairs(normalizedTags);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(normalized));
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
    const raw = readStorageWithLegacy(BATCHES_KEY, LEGACY_BATCHES_KEY);
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
