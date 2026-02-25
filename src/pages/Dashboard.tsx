import { Upload, Target, Users, ArrowUpRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard, TransactionItem, GoalCard, ActionCard } from '../components/ui';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../data/mock';
import { formatCurrency } from '../lib/utils';

export function Dashboard() {
  const navigate = useNavigate();
  const transactions = getTransactionsWithDetails().slice(0, 6);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="page-container">
      {/* Header */}
      <PageHeader title="Dashboard">
        <button className="btn-ghost">
          <Target size={16} />
          New Goal
        </button>
        <button className="btn-primary" onClick={() => navigate('/import')}>
          <Upload size={16} />
          Import
        </button>
      </PageHeader>

      {/* Balance */}
      <section className="mb-12">
        <div className="text-muted mb-2">Total Balance</div>
        <div
          className="text-text mb-7"
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
          <StatCard label="Transferred" value={formatCurrency(stats.totalTransfers)} dotColor="transfer" />
          <StatCard label="Savings Rate" value={`${stats.savingsRate.toFixed(1)}%`} dotColor="muted" />
        </div>
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-10">
        {/* Transactions */}
        <div>
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <Link to="/transactions" className="section-action">
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
                categoryName={tx.category.name}
                accountName={tx.account.name}
                destinationAccountName={tx.destinationAccount?.name}
                transferPairRole={tx.transferPairRole}
                goalName={tx.goal?.name}
                isSplit={!!tx.split}
              />
            ))}
          </div>
        </div>

        {/* Right column: Goals + Actions */}
        <div>
          <div className="section-header">
            <h2 className="section-title">Goals</h2>
            <button className="section-action">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {goals.map((g) => (
              <GoalCard
                key={g.goal.id}
                name={g.goal.name}
                percentage={g.percentage}
                currentAmount={g.currentAmount}
                targetAmount={g.goal.targetAmount}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2 mt-5">
            <ActionCard icon={Upload} label="Import transactions from CSV" onClick={() => navigate('/import')} />
            <ActionCard icon={Target} label="Create a new savings goal" />
            <ActionCard icon={Users} label="Split an expense with others" />
          </div>
        </div>
      </div>
    </div>
  );
}
