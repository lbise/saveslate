import { TrendingUp, TrendingDown, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Badge, CategoryIcon } from '../components/ui';
import {
  ACCOUNTS,
  getNetWorth,
  getMonthlyStats,
  getCategorySpending,
  getTransactionsWithDetails,
} from '../data/mock';
import { formatCurrency, formatRelativeDate, cn } from '../lib/utils';
import { Icon } from '../components/ui/Icon';

export function Dashboard() {
  const netWorth = getNetWorth();
  const stats = getMonthlyStats();
  const categorySpending = getCategorySpending().slice(0, 5);
  const recentTransactions = getTransactionsWithDetails().slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
            Hey there!
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Let's see how your money is vibing today
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-bg)] rounded-full">
          <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
          <span className="text-sm font-medium text-[var(--color-accent)]">
            Looking good!
          </span>
        </div>
      </div>

      {/* Net Worth Card - The Star of the Show */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] p-6 lg:p-8">
          <p className="text-white/80 text-sm font-medium mb-2">Total Balance</p>
          <p className="text-3xl lg:text-4xl font-bold text-white mb-4">
            {formatCurrency(netWorth)}
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/70">Income</p>
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(stats.totalIncome)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/70">Expenses</p>
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(stats.totalExpenses)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACCOUNTS.map((account) => (
          <Card key={account.id} hover className="group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <Icon name={account.icon} size={20} style={{ color: account.color }} />
                </div>
                <Badge
                  variant="muted"
                  className="text-[10px] uppercase tracking-wider"
                >
                  {account.type}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                {account.name}
              </p>
              <p
                className={cn(
                  'text-xl font-bold',
                  account.balance >= 0
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-expense)]'
                )}
              >
                {formatCurrency(account.balance, account.currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two column layout for transactions and spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link
              to="/transactions"
              className="flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--color-border-light)]">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <CategoryIcon
                    icon={transaction.category.icon}
                    color={transaction.category.color}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatRelativeDate(transaction.date)} · {transaction.account.name}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'text-sm font-semibold whitespace-nowrap',
                      transaction.type === 'income'
                        ? 'text-[var(--color-income)]'
                        : 'text-[var(--color-expense)]'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Spending Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Where's the Money Going?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySpending.map((item) => (
              <div key={item.category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      icon={item.category.icon}
                      color={item.category.color}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {item.category.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: item.category.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Stats Summary */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">
                Monthly Income
              </p>
              <p className="text-xl font-bold text-[var(--color-income)]">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">
                Monthly Expenses
              </p>
              <p className="text-xl font-bold text-[var(--color-expense)]">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">
                Net Savings
              </p>
              <p
                className={cn(
                  'text-xl font-bold',
                  stats.netSavings >= 0
                    ? 'text-[var(--color-savings)]'
                    : 'text-[var(--color-expense)]'
                )}
              >
                {formatCurrency(stats.netSavings)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">
                Savings Rate
              </p>
              <p className="text-xl font-bold text-[var(--color-accent)]">
                {stats.savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
