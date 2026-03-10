import { useMemo } from 'react';
import { Upload, Target, Wallet, ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard, TransactionItem, GoalCard, ActionCard, Icon } from '../components/ui';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  useAccounts,
  useAccountBalances,
  useGoalProgress,
  useAnalyticsSummary,
  useAnalyticsByCategory,
  useTransactions,
  useCategories,
  useGoals,
} from '../hooks/api';
import { useFormatCurrency } from '../hooks';
import { inferTransactionType } from '../lib/transaction-type';
import type { Account } from '../types';

const MAX_GOALS = 3;
const MAX_SPENDING_CATEGORIES = 5;
const MAX_RECENT_TRANSACTIONS = 6;

function getCurrentMonthRange() {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = now.toISOString().split('T')[0];
  return { startDate, endDate };
}

export function Dashboard() {
  const { formatCurrency } = useFormatCurrency();
  const navigate = useNavigate();
  const { startDate, endDate } = useMemo(() => getCurrentMonthRange(), []);

  // Data queries
  const { data: accounts = [] } = useAccounts();
  const { data: accountBalances = [] } = useAccountBalances();
  const { data: goalProgress = [] } = useGoalProgress(false);
  const { data: summary } = useAnalyticsSummary({ startDate, endDate });
  const { data: categorySpending = [] } = useAnalyticsByCategory({ startDate, endDate, type: 'expense' });
  const { data: recentTxData } = useTransactions({ pageSize: MAX_RECENT_TRANSACTIONS, sortBy: 'date', sortOrder: 'desc' });
  const { data: categories = [] } = useCategories();
  const { data: goals = [] } = useGoals();

  // Net worth from account balances
  const netWorth = useMemo(
    () => accountBalances.reduce((sum, ab) => sum + ab.computedBalance, 0),
    [accountBalances],
  );

  // Computed balances map for AccountRow
  const computedBalancesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ab of accountBalances) {
      map.set(ab.accountId, ab.computedBalance);
    }
    return map;
  }, [accountBalances]);

  // Monthly stats from analytics summary
  const stats = useMemo(() => ({
    totalIncome: summary?.totalIncome ?? 0,
    totalExpenses: Math.abs(summary?.totalExpenses ?? 0),
    net: summary?.net ?? 0,
    savingsRate: summary && summary.totalIncome > 0
      ? (summary.net / summary.totalIncome) * 100
      : 0,
  }), [summary]);

  // Top goals sorted by progress (closest to completion first)
  const topGoals = useMemo(
    () => [...goalProgress]
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, MAX_GOALS),
    [goalProgress],
  );

  // Enrich recent transactions with category/account/goal names
  const transactions = useMemo(() => {
    if (!recentTxData?.items) return [];
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const goalMap = new Map(goals.map(g => [g.id, g]));

    return recentTxData.items.map(tx => {
      const category = categoryMap.get(tx.categoryId ?? '');
      const account = accountMap.get(tx.accountId);
      const goal = tx.goalId ? goalMap.get(tx.goalId) : undefined;
      return {
        id: tx.id,
        description: tx.description,
        type: inferTransactionType(tx),
        amount: tx.amount,
        currency: tx.currency,
        categoryName: category?.name ?? 'Uncategorized',
        accountName: account?.name ?? 'Unknown',
        transferPairRole: tx.transferPairRole,
        goalName: goal?.name,
        isSplit: !!(tx.split || tx.splitInfo),
      };
    });
  }, [recentTxData, categories, accounts, goals]);

  // Top spending categories
  const topSpending = useMemo(
    () => categorySpending.slice(0, MAX_SPENDING_CATEGORIES),
    [categorySpending],
  );

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      {/* Header */}
      <PageHeader title="Dashboard">
        <Button variant="ghost" onClick={() => navigate('/goals')}>
          <Target size={16} />
          New Goal
        </Button>
        <Button onClick={() => navigate('/import')}>
          <Upload size={16} />
          Import
        </Button>
      </PageHeader>

      {/* Balance */}
      <section className="mb-12">
        <div className="text-base text-dimmed mb-2">Total Balance</div>
        <div
          className="text-foreground mb-7"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '48px',
            fontWeight: 300,
            letterSpacing: '-0.03em',
          }}
        >
          {formatCurrency(netWorth)}
        </div>
        <div className="flex flex-wrap gap-10">
          <StatCard label="Income" value={formatCurrency(stats.totalIncome)} dotColor="income" />
          <StatCard label="Expenses" value={formatCurrency(stats.totalExpenses)} dotColor="expense" />
          <StatCard label="Net" value={formatCurrency(stats.net)} dotColor="transfer" />
          <StatCard label="Savings Rate" value={`${stats.savingsRate.toFixed(1)}%`} dotColor="muted" />
        </div>
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-10">
        {/* Left column */}
        <div className="flex flex-col gap-10">
          {/* Accounts */}
          {accounts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-base font-medium text-muted-foreground">Accounts</h2>
                <Link to="/accounts" className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="flex flex-col gap-1">
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    balance={computedBalancesMap.get(account.id) ?? account.balance}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Top Spending */}
          {topSpending.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-base font-medium text-muted-foreground">Top Spending</h2>
                <Link to="/analytics" className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="flex flex-col gap-1">
                {topSpending.map((cs) => (
                  <SpendingRow
                    key={cs.categoryId ?? 'uncategorized'}
                    categoryName={cs.categoryName ?? 'Uncategorized'}
                    categoryIcon={cs.categoryIcon ?? 'Tag'}
                    amount={Math.abs(cs.total)}
                    percentage={cs.percentage}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-medium text-muted-foreground">Recent Activity</h2>
              <Link to="/transactions" className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col">
              {transactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  description={tx.description}
                  type={tx.type}
                  amount={tx.amount}
                  currency={tx.currency}
                  categoryName={tx.categoryName}
                  accountName={tx.accountName}
                  transferPairRole={tx.transferPairRole}
                  goalName={tx.goalName}
                  isSplit={tx.isSplit}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right column: Goals + Quick Actions */}
        <div>
          {/* Goals */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-medium text-muted-foreground">Goals</h2>
            {goalProgress.length > MAX_GOALS ? (
              <Link to="/goals" className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">
                View all {goalProgress.length} goals <ArrowUpRight size={12} />
              </Link>
            ) : (
              <Link to="/goals" className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">
                View all <ArrowUpRight size={12} />
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {topGoals.map((g) => (
              <GoalCard
                key={g.goalId}
                name={g.name}
                percentage={g.progressPercentage}
                currentAmount={g.currentAmount}
                targetAmount={g.targetAmount}
              />
            ))}
            {topGoals.length === 0 && (
              <div className="text-base text-dimmed py-8 text-center">
                No goals yet
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2 mt-8">
            <h2 className="font-display text-base font-medium text-muted-foreground mb-3">Quick Actions</h2>
            <ActionCard icon={Upload} label="Import transactions from CSV" onClick={() => navigate('/import')} />
            <ActionCard icon={Target} label="Create a new savings goal" onClick={() => navigate('/goals')} />
            <ActionCard icon={Wallet} label="Add a new account" onClick={() => navigate('/accounts')} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components (co-located, not exported) ──────────────────────────

interface AccountRowProps {
  account: Account;
  balance: number;
  formatCurrency: (amount: number, currency?: string) => string;
}

function AccountRow({ account, balance, formatCurrency: fmt }: AccountRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-(--radius-md) transition-colors duration-150 hover:bg-card">
      <div className="w-8 h-8 bg-card rounded-(--radius-sm) flex items-center justify-center shrink-0">
        <Icon name={account.icon} size={16} className="text-muted-foreground" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-base font-medium text-foreground truncate">{account.name}</span>
        <span className="text-sm text-dimmed capitalize">{account.type}</span>
      </div>
      <span
        className={`text-base font-medium ${balance < 0 ? 'text-expense' : 'text-foreground'}`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {fmt(balance, account.currency)}
      </span>
    </div>
  );
}

interface SpendingRowProps {
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
  formatCurrency: (amount: number) => string;
}

function SpendingRow({ categoryName, categoryIcon, amount, percentage, formatCurrency: fmt }: SpendingRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-(--radius-md) transition-colors duration-150 hover:bg-card">
      <div className="w-8 h-8 bg-card rounded-(--radius-sm) flex items-center justify-center shrink-0">
        <Icon name={categoryIcon} size={16} className="text-muted-foreground" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-base font-medium text-foreground truncate">{categoryName}</span>
        <div className="flex items-center gap-2 mt-1">
          <Progress
            value={Math.min(percentage, 100)}
            className="h-1 flex-1 bg-border"
            indicatorClassName="bg-expense"
          />
          <span className="text-sm text-dimmed shrink-0">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <span
        className="text-base font-medium text-foreground shrink-0"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {fmt(amount)}
      </span>
    </div>
  );
}
