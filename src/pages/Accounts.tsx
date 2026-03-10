import { useMemo, useState } from 'react';
import { ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import {
  AccountFormModal,
  ACCOUNT_TYPE_DEFAULT_ICONS,
  ACCOUNT_TYPE_LABELS,
  DEFAULT_ACCOUNT_FORM_STATE,
  createAccountFormStateFromAccount,
  type AccountFormSubmitPayload,
} from '../components/accounts';
import { PageHeader, PageHeaderActions } from '../components/layout';
import { EntityListSkeleton, QueryError } from '../components/layout';
import {
  Badge,
  EntityCard,
  EntityCardDetailList,
  EntityCardOverflowMenu,
  EntityCardSection,
  DeleteConfirmationModal,
} from '../components/ui';
import { formatRelativeDate, cn } from '../lib/utils';
import { useFormatCurrency, useImportExport } from '../hooks';
import { toast } from 'sonner';
import { inferTransactionType } from '../lib/transaction-type';
import {
  useAccounts,
  useAccountBalances,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useTransactions,
} from '../hooks/api';
import type { Account, AccountType } from '../types';
import type { EntityCardDetailTone, EntityCardTone } from '../components/ui';

const ACCOUNTS_EXPORT_SCHEMA_VERSION = 1;

const ACCOUNT_TONES: Record<AccountType, EntityCardTone> = {
  checking: 'transfer',
  savings: 'income',
  credit: 'expense',
  cash: 'neutral',
  investment: 'accent',
  retirement: 'accent',
};

const ACCOUNT_TYPE_BADGE_VARIANTS: Record<AccountType, 'default' | 'income' | 'expense' | 'transfer' | 'muted'> = {
  checking: 'transfer',
  savings: 'income',
  credit: 'expense',
  cash: 'muted',
  investment: 'default',
  retirement: 'default',
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
  const { formatCurrency } = useFormatCurrency();
  const accountsResult = useAccounts();
  const balancesResult = useAccountBalances();
  const createAccount = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const accounts = accountsResult.data ?? [];
  const accountBalances = balancesResult.data ?? [];

  // Show skeleton while primary data is loading
  const isLoading = accountsResult.isLoading || balancesResult.isLoading;
  if (isLoading) return <EntityListSkeleton cardCount={3} />;
  if (accountsResult.isError) return <QueryError message="Failed to load accounts." onRetry={() => accountsResult.refetch()} />;
  if (balancesResult.isError) return <QueryError message="Failed to load balances." onRetry={() => balancesResult.refetch()} />;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const { importError, isImporting, importInputRef, openFilePicker, handleFileChange, exportJsonFile } = useImportExport<Account[]>({
    parseFile: parseImportedAccounts,
    onImportSuccess: async (importedAccounts) => {
      let created = 0;
      const existingNames = new Set(accounts.map(a => a.name.toLowerCase()));
      for (const acc of importedAccounts) {
        if (!existingNames.has(acc.name.toLowerCase())) {
          await createAccount.mutateAsync({
            name: acc.name,
            type: acc.type,
            balance: acc.balance,
            currency: acc.currency,
            icon: acc.icon,
            accountIdentifier: acc.accountIdentifier,
          });
          created++;
        }
      }
      toast.success(`${created} account${created === 1 ? '' : 's'} imported`);
    },
  });

  const computedBalancesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ab of accountBalances) {
      map.set(ab.accountId, ab.computedBalance);
    }
    return map;
  }, [accountBalances]);

  const txCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ab of accountBalances) {
      map.set(ab.accountId, ab.transactionCount);
    }
    return map;
  }, [accountBalances]);

  const netWorth = useMemo(
    () => accountBalances.reduce((sum, ab) => sum + ab.computedBalance, 0),
    [accountBalances],
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

  const accountToDeleteTxCount = useMemo(() => {
    if (!accountToDelete) return 0;
    return txCountMap.get(accountToDelete.id) ?? 0;
  }, [accountToDelete, txCountMap]);

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

  const handleExportAccounts = () => {
    if (accounts.length === 0) return;

    const exportPayload: ExportedAccountsFile = {
      schemaVersion: ACCOUNTS_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      accountCount: accounts.length,
      accounts,
    };

    const fileDate = new Date().toISOString().split('T')[0];
    exportJsonFile(`saveslate-accounts-${fileDate}.json`, exportPayload);
    toast.success('Accounts exported');
  };

  const handleSaveAccount = (accountPayload: AccountFormSubmitPayload) => {
    if (editingAccountId) {
      updateAccountMutation.mutate(
        { id: editingAccountId, ...accountPayload },
        {
          onSuccess: () => {
            closeAccountModal();
            toast.success('Account updated');
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update account'),
        },
      );
    } else {
      createAccount.mutate(accountPayload, {
        onSuccess: () => {
          closeAccountModal();
          toast.success('Account created');
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create account'),
      });
    }
  };

  const handleConfirmDeleteAccount = () => {
    if (!accountToDelete) return;

    deleteAccountMutation.mutate(accountToDelete.id, {
      onSuccess: () => {
        if (editingAccountId === accountToDelete.id) {
          closeAccountModal();
        }
        setAccountToDelete(null);
        toast.success('Account deleted');
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete account'),
    });
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      <PageHeader title="Accounts">
        <PageHeaderActions
          onImport={openFilePicker}
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
          void handleFileChange(event);
        }}
        className="hidden"
      />

      {importError && (
        <p className="text-sm text-expense mb-3">{importError}</p>
      )}

      {accountToDelete && (
        <DeleteConfirmationModal
          title="Delete account?"
          description={(
            <>
              This will permanently delete <span className="text-foreground">{accountToDelete.name}</span>.
            </>
          )}
          details={accountToDeleteTxCount > 0 ? (
            <p className="text-sm text-warning">
              {accountToDeleteTxCount} transaction{accountToDeleteTxCount === 1 ? '' : 's'} are linked to this account. They will stay in your history and appear as Unknown Account.
            </p>
          ) : undefined}
          confirmLabel="Delete account"
          onConfirm={handleConfirmDeleteAccount}
          onClose={() => setAccountToDelete(null)}
        />
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

      <section className="mb-12">
        <div className="text-base text-dimmed mb-2">Net Worth</div>
        <div
          className="text-foreground"
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

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-medium text-muted-foreground">All Accounts</h2>
        <span className="text-sm text-dimmed">{accounts.length} accounts</span>
      </div>

      {accounts.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-base text-foreground">No accounts yet.</p>
          <p className="text-sm text-dimmed mt-1">Create your first account or import an accounts file.</p>
          <Button className="mt-4" onClick={openCreateModal}>Create Account</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              computedBalance={computedBalancesMap.get(account.id) ?? account.balance}
              transactionCount={txCountMap.get(account.id) ?? 0}
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
  computedBalance: number;
  transactionCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

function AccountRow({ account, computedBalance, transactionCount, onEdit, onDelete }: AccountRowProps) {
  const { formatCurrency, formatSignedCurrency } = useFormatCurrency();
  const { data: recentTxData } = useTransactions({
    accountId: account.id,
    pageSize: 3,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const recentTransactions = recentTxData?.items ?? [];
  const isNegative = computedBalance < 0;
  const balanceTone: EntityCardDetailTone = isNegative ? 'expense' : 'strong';

  return (
    <EntityCard
      icon={account.icon}
      title={account.name}
      subtitle={account.currency}
      tone={ACCOUNT_TONES[account.type]}
      metric={formatCurrency(computedBalance, account.currency)}
      metricClassName={balanceTone === 'expense' ? 'text-expense' : 'text-foreground'}
      badges={<Badge variant={ACCOUNT_TYPE_BADGE_VARIANTS[account.type]}>{ACCOUNT_TYPE_LABELS[account.type]}</Badge>}
      actions={(
        <EntityCardOverflowMenu
          label={`More actions for ${account.name}`}
          actions={[
            { label: 'Edit', icon: Pencil, onClick: onEdit },
            { label: 'Delete', icon: Trash2, onClick: onDelete, tone: 'danger' },
          ]}
        />
      )}
    >
      <EntityCardDetailList
        items={[
          { label: 'Total transactions', value: String(transactionCount), tone: 'strong' },
          {
            label: 'Account number',
            value: account.accountIdentifier ?? 'Not set',
            tone: account.accountIdentifier ? 'default' : 'muted',
          },
        ]}
      />

      {recentTransactions.length > 0 && (
        <EntityCardSection
          title="Recent"
          action={(
            <Link to={`/transactions?account=${encodeURIComponent(account.id)}`} className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">
              View all <ArrowUpRight size={10} />
            </Link>
          )}
        >
          <div className="flex flex-col gap-2">
            {recentTransactions.map((tx) => {
              const txType = inferTransactionType(tx);
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-muted-foreground truncate max-w-[220px]">{tx.description}</span>
                    <span className="text-sm text-dimmed">{formatRelativeDate(tx.date)}</span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium shrink-0',
                      txType === 'income'
                        ? 'text-income'
                        : txType === 'expense'
                          ? 'text-expense'
                          : tx.amount > 0
                            ? 'text-income'
                            : tx.amount < 0
                              ? 'text-expense'
                              : 'text-foreground',
                    )}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {formatSignedCurrency(tx.amount, tx.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </EntityCardSection>
      )}
    </EntityCard>
  );
}
