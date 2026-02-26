import { loadBalancedDemoTransactions, loadTightDemoTransactions } from '../data/fixtures/transactions';
import type { Transaction } from '../types';
import { loadActiveDataProfile, type DataProfile } from './data-profile';
import { loadTransactions } from './transaction-storage';

export interface TransactionRepository {
  readonly profile: DataProfile;
  loadTransactions(): Transaction[];
}

class LocalTransactionRepository implements TransactionRepository {
  public readonly profile: DataProfile = 'local';

  public loadTransactions(): Transaction[] {
    return loadTransactions();
  }
}

class BalancedDemoTransactionRepository implements TransactionRepository {
  public readonly profile: DataProfile = 'demo-balanced';

  public loadTransactions(): Transaction[] {
    return loadBalancedDemoTransactions();
  }
}

class TightDemoTransactionRepository implements TransactionRepository {
  public readonly profile: DataProfile = 'demo-tight';

  public loadTransactions(): Transaction[] {
    return loadTightDemoTransactions();
  }
}

function createTransactionRepository(profile: DataProfile): TransactionRepository {
  switch (profile) {
    case 'demo-balanced':
      return new BalancedDemoTransactionRepository();
    case 'demo-tight':
      return new TightDemoTransactionRepository();
    case 'local':
    default:
      return new LocalTransactionRepository();
  }
}

export function getActiveTransactionRepository(): TransactionRepository {
  return createTransactionRepository(loadActiveDataProfile());
}

export function loadTransactionsForActiveProfile(): Transaction[] {
  return getActiveTransactionRepository().loadTransactions();
}
