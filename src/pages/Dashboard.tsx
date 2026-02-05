import { TrendingUp, TrendingDown, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Badge, TagIcon } from '../components/ui';
import {
  ACCOUNTS,
  getNetWorth,
  getMonthlyStats,
  getTagSpending,
  getTransactionsWithDetails,
} from '../data/mock';
import { formatCurrency, formatRelativeDate, cn } from '../lib/utils';
import { Icon } from '../components/ui/Icon';

export function Dashboard() {
  const netWorth = getNetWorth();
  const stats = getMonthlyStats();
  const tagSpending = getTagSpending().slice(0, 5);
  const recentTransactions = getTransactionsWithDetails().slice(0, 5);

  return (
    <div className="page-container">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1">Hey there!</h1>
          <p className="text-body mt-1">
            Let's see how your money is vibing today
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent/15 rounded-full">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">
            Looking good!
          </span>
        </div>
      </div>

      {/* Net Worth Card - The Star of the Show */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-accent to-accent/80 p-6 lg:p-8">
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
              <p className="text-body mb-1">
                {account.name}
              </p>
              <p
                className={cn(
                  'text-xl font-bold',
                  account.balance >= 0 ? 'text-text' : 'text-expense'
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
            <Link to="/transactions" className="text-link">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentTransactions.map((transaction) => {
                // Use first tag for display
                const primaryTag = transaction.tags[0];
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-surface/50 transition-colors"
                  >
                    {primaryTag && (
                      <TagIcon
                        icon={primaryTag.icon}
                        color={primaryTag.color}
                        size="sm"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatRelativeDate(transaction.date)} · {transaction.account.name}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'text-sm font-semibold whitespace-nowrap',
                        transaction.type === 'income' ? 'text-income' : 'text-expense'
                      )}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Spending Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Where's the Money Going?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tagSpending.map((item) => (
              <div key={item.tag.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TagIcon
                      icon={item.tag.icon}
                      color={item.tag.color}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-text">
                      {item.tag.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-text">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: item.tag.color,
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
              <p className="text-muted mb-1">Monthly Income</p>
              <p className="text-xl font-bold text-income">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            <div>
              <p className="text-muted mb-1">Monthly Expenses</p>
              <p className="text-xl font-bold text-expense">
                {formatCurrency(stats.totalExpenses)}
              </p>
            </div>
            <div>
              <p className="text-muted mb-1">Net Savings</p>
              <p
                className={cn(
                  'text-xl font-bold',
                  stats.netSavings >= 0 ? 'text-income' : 'text-expense'
                )}
              >
                {formatCurrency(stats.netSavings)}
              </p>
            </div>
            <div>
              <p className="text-muted mb-1">Savings Rate</p>
              <p className="text-xl font-bold text-accent">
                {stats.savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
