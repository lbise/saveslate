import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowUpRight, ChevronDown, Pencil, Search, Trash2, X } from 'lucide-react';
import { PageHeader, PageHeaderActions } from '../components/layout';
import { Icon } from '../components/ui';
import {
  addAccount,
  deleteAccount,
  loadAccounts,
  mergeAccounts,
  updateAccount,
} from '../lib/account-storage';
import { getCurrencyOptionsWithFallback } from '../lib/currencies';
import { formatCurrency, formatRelativeDate, cn } from '../lib/utils';
import { getCategoryById, getTransactionsByAccount } from '../data/mock';
import type { Account, AccountType } from '../types';

const ACCOUNTS_EXPORT_SCHEMA_VERSION = 1;

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
  cash: 'Cash',
};

const ACCOUNT_TYPE_DEFAULT_ICONS: Record<AccountType, string> = {
  checking: 'Wallet',
  savings: 'PiggyBank',
  credit: 'CreditCard',
  cash: 'Banknote',
};

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

interface AccountFormState {
  name: string;
  type: AccountType;
  startingBalance: string;
  currency: string;
  accountIdentifier: string;
  icon: string;
}

const DEFAULT_FORM_STATE: AccountFormState = {
  name: '',
  type: 'checking',
  startingBalance: '0',
  currency: 'CHF',
  accountIdentifier: '',
  icon: ACCOUNT_TYPE_DEFAULT_ICONS.checking,
};

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
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [form, setForm] = useState<AccountFormState>(DEFAULT_FORM_STATE);
  const importInputRef = useRef<HTMLInputElement>(null);

  const netWorth = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );

  const allIconNames = useMemo(
    () => Object.keys(LucideIcons.icons).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filteredIconNames = useMemo(() => {
    const query = iconSearchQuery.trim().toLowerCase();
    if (!query) return allIconNames;
    return allIconNames.filter((iconName) => iconName.toLowerCase().includes(query));
  }, [allIconNames, iconSearchQuery]);

  const currencyOptions = useMemo(() => getCurrencyOptionsWithFallback(form.currency), [form.currency]);

  const isEditing = editingAccountId !== null;
  const accountToDeleteTransactionCount = useMemo(() => {
    if (!accountToDelete) {
      return 0;
    }

    return getTransactionsByAccount(accountToDelete.id).length;
  }, [accountToDelete]);

  const closeAccountModal = () => {
    setIsCreateModalOpen(false);
    setIsIconPickerOpen(false);
    setEditingAccountId(null);
  };

  const openCreateModal = () => {
    setForm(DEFAULT_FORM_STATE);
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
    setEditingAccountId(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setForm({
      name: account.name,
      type: account.type,
      startingBalance: String(account.balance),
      currency: account.currency,
      accountIdentifier: account.accountIdentifier ?? '',
      icon: account.icon,
    });
    setIconSearchQuery('');
    setIsIconPickerOpen(false);
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

  const handleSaveAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const accountName = form.name.trim();
    const startingBalance = Number(form.startingBalance);
    if (!accountName || Number.isNaN(startingBalance) || !Number.isFinite(startingBalance)) {
      return;
    }

    const accountPayload = {
      name: accountName,
      type: form.type,
      balance: startingBalance,
      currency: form.currency.trim().toUpperCase() || 'CHF',
      icon: form.icon,
      accountIdentifier: form.accountIdentifier.trim() || undefined,
    };

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
        <>
          <div
            className="fixed inset-0 z-30 bg-bg/70"
            onClick={closeAccountModal}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <section className="card w-full max-w-xl p-5">
              <div className="section-header mb-4">
                <h2 className="heading-3 text-text">{isEditing ? 'Edit Account' : 'Create Account'}</h2>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={closeAccountModal}
                >
                  <X size={16} />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSaveAccount}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label mb-1.5 block" htmlFor="account-name">Name</label>
                    <input
                      id="account-name"
                      className="input"
                      placeholder="Daily account"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="label mb-1.5 block" htmlFor="account-type">Type</label>
                    <select
                      id="account-type"
                      className="select"
                      value={form.type}
                      onChange={(event) => {
                        const nextType = event.target.value as AccountType;
                        setForm((current) => {
                          const nextIcon = current.icon === ACCOUNT_TYPE_DEFAULT_ICONS[current.type]
                            ? ACCOUNT_TYPE_DEFAULT_ICONS[nextType]
                            : current.icon;

                          return {
                            ...current,
                            type: nextType,
                            icon: nextIcon,
                          };
                        });
                      }}
                    >
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label mb-1.5 block" htmlFor="account-starting-balance">
                      Starting balance
                    </label>
                    <input
                      id="account-starting-balance"
                      className="input"
                      type="number"
                      step="0.01"
                      value={form.startingBalance}
                      onChange={(event) => setForm((current) => ({ ...current, startingBalance: event.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="label mb-1.5 block" htmlFor="account-currency">Currency</label>
                    <select
                      id="account-currency"
                      className="select"
                      value={form.currency}
                      onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                      required
                    >
                      {currencyOptions.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.label} ({currency.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label mb-1.5 block" htmlFor="account-identifier">Account number / IBAN (optional)</label>
                  <input
                    id="account-identifier"
                    className="input"
                    placeholder="CH97 0029 0290 IN11 3984 2"
                    value={form.accountIdentifier}
                    onChange={(event) => setForm((current) => ({ ...current, accountIdentifier: event.target.value }))}
                  />
                </div>

                <div className="relative">
                  <label className="label mb-1.5 block" htmlFor="account-icon-search">Icon</label>
                  <button
                    type="button"
                    className="input flex items-center justify-between"
                    onClick={() => setIsIconPickerOpen((current) => !current)}
                    aria-expanded={isIconPickerOpen}
                    aria-controls="account-icon-picker"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon name={form.icon} size={16} className="text-text" />
                      <span className="text-body text-text truncate">{form.icon}</span>
                    </span>
                    <ChevronDown size={16} className="text-text-muted" />
                  </button>

                  {isIconPickerOpen && (
                    <div id="account-icon-picker" className="card absolute z-20 mt-2 w-full p-3">
                      <div className="relative mb-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          id="account-icon-search"
                          className="input pl-9"
                          placeholder="Search icon"
                          value={iconSearchQuery}
                          onChange={(event) => setIconSearchQuery(event.target.value)}
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto rounded-(--radius-md) border border-border">
                        {filteredIconNames.map((iconName) => {
                          const isSelected = form.icon === iconName;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => {
                                setForm((current) => ({ ...current, icon: iconName }));
                                setIsIconPickerOpen(false);
                              }}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 text-left border-none bg-transparent',
                                'transition-colors duration-150',
                                isSelected
                                  ? 'bg-surface-hover text-text'
                                  : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                              )}
                            >
                              <Icon name={iconName} size={16} />
                              <span className="text-ui">{iconName}</span>
                            </button>
                          );
                        })}

                        {filteredIconNames.length === 0 && (
                          <div className="px-3 py-4 text-ui text-text-muted">No icons found.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeAccountModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {isEditing ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </>
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
