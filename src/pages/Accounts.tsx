import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Icon } from '../components/ui';
import { ACCOUNTS, getNetWorth, getTransactionsByAccount, getCategoryById } from '../data/mock';
import { formatCurrency, formatRelativeDate, cn } from '../lib/utils';

export function Accounts() {
  const netWorth = getNetWorth();

  return (
    <div className="page-container">
      <PageHeader title="Accounts" />

      {/* Net Worth */}
      <section style={{ marginBottom: '48px', marginTop: '-32px' }}>
        <div className="text-[13px] text-text-muted mb-2">Net Worth</div>
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

      {/* Accounts List */}
      <div className="section-header">
        <h2 className="section-title">All Accounts</h2>
        <span className="text-[11px] text-text-muted">{ACCOUNTS.length} accounts</span>
      </div>

      <div className="flex flex-col gap-3">
        {ACCOUNTS.map((account) => (
          <AccountRow key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}

interface AccountRowProps {
  account: {
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    color: string;
    icon: string;
  };
}

function AccountRow({ account }: AccountRowProps) {
  const recentTransactions = getTransactionsByAccount(account.id).slice(0, 3);
  const isNegative = account.balance < 0;

  return (
    <div className="p-5 bg-surface rounded-(--radius-lg) transition-colors duration-150 hover:bg-surface-hover cursor-pointer">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-(--radius-md) flex items-center justify-center"
            style={{ backgroundColor: `${account.color}20` }}
          >
            <Icon name={account.icon} size={18} style={{ color: account.color }} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-text">{account.name}</div>
            <div className="text-[11px] text-text-muted capitalize">{account.type}</div>
          </div>
        </div>
        <div
          className={cn(
            'text-lg font-medium',
            isNegative ? 'text-expense' : 'text-text',
          )}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {formatCurrency(account.balance)}
        </div>
      </div>

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div className="border-t border-border pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-text-muted uppercase tracking-wider">Recent</span>
            <span className="text-[11px] text-text-muted flex items-center gap-0.5 hover:text-text transition-colors cursor-pointer">
              View all <ArrowUpRight size={10} />
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {recentTransactions.map((tx) => {
              const category = getCategoryById(tx.categoryId);
              const txType = category?.type ?? 'expense';
              return (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[12px] text-text-secondary truncate max-w-[200px]">
                      {tx.description}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {formatRelativeDate(tx.date)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[12px] font-medium',
                      txType === 'income' ? 'text-income' : txType === 'transfer' ? 'text-text' : 'text-expense',
                    )}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {txType === 'income' ? '+' : txType === 'transfer' ? '' : '-'}{formatCurrency(tx.amount)}
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
