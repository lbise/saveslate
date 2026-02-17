import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import {
  AccountFormModal,
  ACCOUNT_TYPE_DEFAULT_ICONS,
  ACCOUNT_TYPE_LABELS,
  DEFAULT_ACCOUNT_FORM_STATE,
  createAccountFormStateFromAccount,
  type AccountFormSubmitPayload,
} from '../components/accounts';
import { PageHeader, PageHeaderActions } from '../components/layout';
import { Icon } from '../components/ui';
import {
  addAccount,
  deleteAccount,
  loadAccounts,
  mergeAccounts,
  updateAccount,
} from '../lib/account-storage';
import { formatCurrency, formatRelativeDate, cn } from '../lib/utils';
import { getCategoryById, getTransactionsByAccount } from '../data/mock';
import type { Account, AccountType } from '../types';

const ACCOUNTS_EXPORT_SCHEMA_VERSION = 1;

const ACCOUNT_TYPE_ICON_STYLES: Record<AccountType, { bg: string; text: string }> = {
  checking: { bg: 'bg-accent/12', text: 'text-accent' },
  savings: { bg: 'bg-income/12', text: 'text-income' },
  credit: { bg: 'bg-expense/12', text: 'text-expense' },
  cash: { bg: 'bg-transfer/12', text: 'text-transfer' },
};

interface ExportedAccountsFile {
  schemaVersion: number;
  exportedAt: string;
  accountCount: number;
  accounts: Account[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAccountType(value: unknown): value is AccountType {
  return value === 'checking' || value === 'savings' || value === 'credit' || value === 'cash';
}

function parseImportedAccount(entry: unknown, index: number): Account {
  if (!isRecord(entry)) {
    throw new Error(`Account #${index + 1} is invalid.`);
  }

  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (!name) {
    throw new Error(`Account #${index + 1} is missing a name.`);
  }

  if (!isAccountType(entry.type)) {
    throw new Error(`Account #${index + 1} has an invalid type.`);
  }

  const balance = typeof entry.balance === 'number' && Number.isFinite(entry.balance)
    ? entry.balance
    : Number.NaN;
  if (Number.isNaN(balance)) {
    throw new Error(`Account #${index + 1} has an invalid starting balance.`);
  }

  const currency = typeof entry.currency === 'string' && entry.currency.trim().length > 0
    ? entry.currency.trim().toUpperCase()
    : 'CHF';

  const icon = typeof entry.icon === 'string' && entry.icon.trim().length > 0
    ? entry.icon.trim()
    : ACCOUNT_TYPE_DEFAULT_ICONS[entry.type];

  return {
    id: typeof entry.id === 'string' ? entry.id.trim() : '',
    name,
    type: entry.type,
    balance,
    currency,
    icon,
    accountIdentifier: typeof entry.accountIdentifier === 'string' && entry.accountIdentifier.trim().length > 0
      ? entry.accountIdentifier.trim()
      : undefined,
  };
}

function parseImportedAccounts(rawContent: string): Account[] {
  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(rawContent) as unknown;
  } catch {
    throw new Error('Invalid JSON file.');
  }

  if (!Array.isArray(parsedContent) && !isRecord(parsedContent)) {
    throw new Error('Invalid accounts file format.');
  }

  if (
    isRecord(parsedContent)
    && 'schemaVersion' in parsedContent
    && parsedContent.schemaVersion !== ACCOUNTS_EXPORT_SCHEMA_VERSION
  ) {
    throw new Error('Unsupported accounts file version.');
  }

  const rawAccounts = Array.isArray(parsedContent)
    ? parsedContent
    : parsedContent.accounts;

  if (!Array.isArray(rawAccounts)) {
    throw new Error('Accounts file is missing an accounts array.');
  }

  const importedAccounts = rawAccounts.map((account, index) => parseImportedAccount(account, index));
  if (importedAccounts.length === 0) {
    throw new Error('No accounts found in file.');
  }

  return importedAccounts;
}

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>(() => loadAccounts());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const netWorth = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );

  const isEditing = editingAccountId !== null;
  const editingAccount = useMemo(
    () =>
      editingAccountId
        ? accounts.find((account) => account.id === editingAccountId) ?? null
        : null,
    [accounts, editingAccountId],
  );
  const accountFormInitialValues = useMemo(
    () =>
      editingAccount
        ? createAccountFormStateFromAccount(editingAccount)
        : DEFAULT_ACCOUNT_FORM_STATE,
    [editingAccount],
  );

  const accountToDeleteTransactionCount = useMemo(() => {
    if (!accountToDelete) {
      return 0;
    }

    return getTransactionsByAccount(accountToDelete.id).length;
  }, [accountToDelete]);

  const closeAccountModal = () => {
    setIsCreateModalOpen(false);
    setEditingAccountId(null);
  };

  const openCreateModal = () => {
    setEditingAccountId(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccountId(account.id);
    setIsCreateModalOpen(true);
  };

  const handleOpenImportPicker = () => {
    setImportError(null);
    importInputRef.current?.click();
  };

  const handleExportAccounts = () => {
    if (accounts.length === 0) {
      return;
    }

    const exportPayload: ExportedAccountsFile = {
      schemaVersion: ACCOUNTS_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      accountCount: accounts.length,
      accounts,
    };

    const fileDate = new Date().toISOString().split('T')[0];
    const fileName = `accounts-${fileDate}.json`;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImportAccountsFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const fileContent = await file.text();
      const importedAccounts = parseImportedAccounts(fileContent);

      const mergedAccounts = mergeAccounts(importedAccounts);
      setAccounts(mergedAccounts);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import accounts file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveAccount = (accountPayload: AccountFormSubmitPayload) => {
    if (editingAccountId) {
      updateAccount(editingAccountId, accountPayload);
    } else {
      addAccount({
        id: `account-${Date.now()}`,
        ...accountPayload,
      });
    }

    setAccounts(loadAccounts());
    closeAccountModal();
  };

  const handleConfirmDeleteAccount = () => {
    if (!accountToDelete) {
      return;
    }

    deleteAccount(accountToDelete.id);
    setAccounts(loadAccounts());
    if (editingAccountId === accountToDelete.id) {
      closeAccountModal();
    }
    setAccountToDelete(null);
  };

  return (
    <div className="page-container">
      <PageHeader title="Accounts">
        <PageHeaderActions
          onImport={handleOpenImportPicker}
          onExport={handleExportAccounts}
          onCreate={openCreateModal}
          importDisabled={isImporting}
          exportDisabled={accounts.length === 0}
          importLabel={isImporting ? 'Importing...' : 'Import'}
          createLabel="New"
        />
      </PageHeader>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImportAccountsFile(event);
        }}
        className="hidden"
      />

      {importError && (
        <p className="text-ui text-expense mb-3">{importError}</p>
      )}

      {accountToDelete && (
        <>
          <div
            className="fixed inset-0 z-30 bg-bg/70"
            onClick={() => setAccountToDelete(null)}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="card w-full max-w-md p-5 space-y-4">
              <h2 className="heading-2">Delete account?</h2>
              <p className="text-body">
                This will permanently delete <span className="text-text">{accountToDelete.name}</span>.
              </p>
              {accountToDeleteTransactionCount > 0 ? (
                <p className="text-ui text-warning">
                  {accountToDeleteTransactionCount} transaction{accountToDeleteTransactionCount === 1 ? '' : 's'} are linked to this account.
                  They will stay in your history and appear as Unknown Account.
                </p>
              ) : (
                <p className="text-ui text-text-muted">This action cannot be undone.</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  className="btn-secondary border-expense/40 text-expense hover:bg-expense/10 hover:border-expense"
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isCreateModalOpen && (
        <AccountFormModal
          key={editingAccountId ?? 'create'}
          mode={isEditing ? 'edit' : 'create'}
          initialValues={accountFormInitialValues}
          onCancel={closeAccountModal}
          onSubmit={handleSaveAccount}
        />
      )}

      <section style={{ marginBottom: '48px', marginTop: '-32px' }}>
        <div className="text-muted mb-2">Net Worth</div>
        <div
          className="text-text"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '40px',
            fontWeight: 300,
            letterSpacing: '-0.03em',
          }}
        >
          {formatCurrency(netWorth)}
        </div>
      </section>

      <div className="section-header">
        <h2 className="section-title">All Accounts</h2>
        <span className="text-ui text-text-muted">{accounts.length} accounts</span>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-body text-text">No accounts yet.</p>
          <p className="text-ui text-text-muted mt-1">Create your first account or import an accounts file.</p>
          <button className="btn-primary mt-4" onClick={openCreateModal}>Create Account</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onEdit={() => openEditModal(account)}
              onDelete={() => setAccountToDelete(account)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AccountRowProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}

function AccountRow({ account, onEdit, onDelete }: AccountRowProps) {
  const recentTransactions = getTransactionsByAccount(account.id).slice(0, 3);
  const isNegative = account.balance < 0;
  const iconStyle = ACCOUNT_TYPE_ICON_STYLES[account.type];

  return (
    <div className="p-5 bg-surface rounded-(--radius-lg) transition-colors duration-150 hover:bg-surface-hover">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-9 h-9 rounded-(--radius-md) flex items-center justify-center shrink-0', iconStyle.bg)}>
            <Icon name={account.icon} size={18} className={iconStyle.text} />
          </div>
          <div className="min-w-0">
            <div className="text-body font-medium text-text truncate">{account.name}</div>
            <div className="text-ui text-text-muted flex items-center gap-1 flex-wrap">
              <span>{ACCOUNT_TYPE_LABELS[account.type]}</span>
              {account.accountIdentifier && (
                <>
                  <span>&middot;</span>
                  <span className="truncate max-w-[260px]" title={account.accountIdentifier}>
                    {account.accountIdentifier}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-colors"
            aria-label={`Edit account ${account.name}`}
            title={`Edit ${account.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-expense transition-colors"
            aria-label={`Delete account ${account.name}`}
            title={`Delete ${account.name}`}
          >
            <Trash2 size={14} />
          </button>
          <div
            className={cn(
              'text-body font-medium shrink-0 ml-1',
              isNegative ? 'text-expense' : 'text-text',
            )}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {formatCurrency(account.balance, account.currency)}
          </div>
        </div>
      </div>

      {recentTransactions.length > 0 && (
        <div className="border-t border-border pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-ui text-text-muted uppercase tracking-wider">Recent</span>
            <span className="text-ui text-text-muted flex items-center gap-0.5">
              View all <ArrowUpRight size={10} />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {recentTransactions.map((tx) => {
              const category = getCategoryById(tx.categoryId);
              const txType = category?.type ?? 'expense';
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-ui truncate max-w-[200px]">
                      {tx.description}
                    </span>
                    <span className="text-ui text-text-muted">
                      {formatRelativeDate(tx.date)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-ui font-medium shrink-0',
                      txType === 'income' ? 'text-income' : txType === 'transfer' ? 'text-text' : 'text-expense',
                    )}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {txType === 'income' ? '+' : txType === 'transfer' ? '' : '-'}
                    {formatCurrency(Math.abs(tx.amount), tx.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
