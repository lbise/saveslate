/**
 * Design 7: DARK EDITORIAL
 * 
 * Aesthetic: Dark version of the magazine/editorial theme
 * - Deep charcoal with champagne/cream accents
 * - Libre Baskerville + Inter for refined typography
 * - Generous whitespace, editorial hierarchy
 * - Subtle borders, refined details
 * - Sophisticated, newspaper-inspired dark mode
 */

import {
  Upload,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../data/mock';
import { formatCurrency } from '../../lib/utils';

export function Design7() {
  const transactions = getTransactionsWithDetails().slice(0, 5);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design7-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        
        .design7-root {
          --d7-bg: #0f0f0f;
          --d7-surface: #171717;
          --d7-surface-elevated: #1f1f1f;
          --d7-border: #2a2a2a;
          --d7-border-subtle: #222222;
          --d7-text: #f0f0f0;
          --d7-text-secondary: #a0a0a0;
          --d7-text-muted: #606060;
          --d7-champagne: #d4c5a9;
          --d7-champagne-dark: #b8a88a;
          --d7-income: #8fbc8f;
          --d7-expense: #cd8b8b;
          
          font-family: 'Inter', sans-serif;
          background: var(--d7-bg);
          color: var(--d7-text);
          min-height: 100vh;
          font-weight: 400;
        }
        
        .d7-container {
          max-width: 1140px;
          margin: 0 auto;
          padding: 64px 48px;
        }
        
        .d7-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 64px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--d7-border);
        }
        
        .d7-masthead {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .d7-edition {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--d7-champagne);
        }
        
        .d7-logo {
          font-family: 'Libre Baskerville', serif;
          font-size: 32px;
          font-weight: 400;
          letter-spacing: -0.02em;
        }
        
        .d7-logo em {
          font-style: italic;
          color: var(--d7-champagne);
        }
        
        .d7-header-actions {
          display: flex;
          gap: 16px;
        }
        
        .d7-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .d7-btn-primary {
          background: var(--d7-champagne);
          color: var(--d7-bg);
        }
        
        .d7-btn-primary:hover {
          background: var(--d7-champagne-dark);
        }
        
        .d7-btn-outline {
          background: transparent;
          color: var(--d7-text);
          border: 1px solid var(--d7-border);
        }
        
        .d7-btn-outline:hover {
          border-color: var(--d7-champagne);
        }
        
        /* Feature section */
        .d7-feature {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 64px;
          margin-bottom: 64px;
          padding-bottom: 48px;
          border-bottom: 1px solid var(--d7-border);
        }
        
        .d7-feature-main {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .d7-feature-kicker {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--d7-text-muted);
          margin-bottom: 16px;
        }
        
        .d7-feature-amount {
          font-family: 'Libre Baskerville', serif;
          font-size: 64px;
          font-weight: 400;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 24px;
        }
        
        .d7-feature-deck {
          font-size: 16px;
          line-height: 1.7;
          color: var(--d7-text-secondary);
          max-width: 480px;
        }
        
        .d7-sidebar-stats {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-left: 32px;
          border-left: 1px solid var(--d7-border);
        }
        
        .d7-sidebar-stat {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .d7-sidebar-stat-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--d7-text-muted);
        }
        
        .d7-sidebar-stat-value {
          font-family: 'Libre Baskerville', serif;
          font-size: 32px;
          font-weight: 400;
        }
        
        .d7-sidebar-stat-value.income { color: var(--d7-income); }
        .d7-sidebar-stat-value.expense { color: var(--d7-expense); }
        .d7-sidebar-stat-value.rate { color: var(--d7-champagne); }
        
        /* Main content */
        .d7-content {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 48px;
        }
        
        .d7-section {
          margin-bottom: 48px;
        }
        
        .d7-section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--d7-border-subtle);
        }
        
        .d7-section-title {
          font-family: 'Libre Baskerville', serif;
          font-size: 18px;
          font-weight: 400;
        }
        
        .d7-section-link {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--d7-text-muted);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.2s;
        }
        
        .d7-section-link:hover {
          color: var(--d7-champagne);
        }
        
        /* Transactions */
        .d7-tx {
          display: grid;
          grid-template-columns: 56px 1fr auto;
          gap: 20px;
          align-items: center;
          padding: 20px 0;
          border-bottom: 1px solid var(--d7-border-subtle);
        }
        
        .d7-tx:last-child {
          border-bottom: none;
        }
        
        .d7-tx-date {
          text-align: center;
        }
        
        .d7-tx-day {
          font-family: 'Libre Baskerville', serif;
          font-size: 24px;
          line-height: 1;
        }
        
        .d7-tx-month {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--d7-text-muted);
          margin-top: 4px;
        }
        
        .d7-tx-content {
          min-width: 0;
        }
        
        .d7-tx-desc {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .d7-tx-meta {
          font-size: 12px;
          color: var(--d7-text-muted);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d7-tx-tag {
          color: var(--d7-text-secondary);
        }
        
        .d7-tx-split {
          color: var(--d7-champagne-dark);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .d7-tx-amount {
          font-family: 'Libre Baskerville', serif;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .d7-tx-amount.income { color: var(--d7-income); }
        .d7-tx-amount.expense { color: var(--d7-expense); }
        
        /* Goals */
        .d7-goals {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .d7-goal {
          padding: 24px;
          background: var(--d7-surface);
          border: 1px solid var(--d7-border-subtle);
          transition: border-color 0.2s;
        }
        
        .d7-goal:hover {
          border-color: var(--d7-champagne-dark);
        }
        
        .d7-goal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .d7-goal-name {
          font-family: 'Libre Baskerville', serif;
          font-size: 16px;
          font-weight: 400;
          margin-bottom: 4px;
        }
        
        .d7-goal-deadline {
          font-size: 11px;
          color: var(--d7-text-muted);
        }
        
        .d7-goal-percent {
          font-family: 'Libre Baskerville', serif;
          font-size: 24px;
          color: var(--d7-champagne);
        }
        
        .d7-goal-bar {
          height: 2px;
          background: var(--d7-border);
          margin-bottom: 12px;
        }
        
        .d7-goal-fill {
          height: 100%;
          background: var(--d7-champagne);
          transition: width 0.5s ease;
        }
        
        .d7-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--d7-text-muted);
        }
        
        /* Actions */
        .d7-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        
        .d7-action {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px 16px;
          background: var(--d7-surface);
          border: 1px solid var(--d7-border-subtle);
          cursor: pointer;
          transition: all 0.2s;
          color: var(--d7-text-secondary);
        }
        
        .d7-action:hover {
          border-color: var(--d7-champagne);
          color: var(--d7-champagne);
        }
        
        .d7-action-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        
        /* Callout */
        .d7-callout {
          margin-top: 32px;
          padding: 24px;
          background: var(--d7-surface);
          border-left: 2px solid var(--d7-champagne);
        }
        
        .d7-callout-title {
          font-family: 'Libre Baskerville', serif;
          font-size: 14px;
          font-style: italic;
          margin-bottom: 8px;
          color: var(--d7-champagne);
        }
        
        .d7-callout-text {
          font-size: 13px;
          line-height: 1.6;
          color: var(--d7-text-secondary);
        }
        
        @media (max-width: 1024px) {
          .d7-feature {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .d7-sidebar-stats {
            flex-direction: row;
            padding-left: 0;
            padding-top: 24px;
            border-left: none;
            border-top: 1px solid var(--d7-border);
          }
          .d7-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="d7-container">
        {/* Header */}
        <header className="d7-header">
          <div className="d7-masthead">
            <div className="d7-edition">Personal Finance</div>
            <div className="d7-logo">Melo<em>Money</em></div>
          </div>
          <div className="d7-header-actions">
            <button className="d7-btn d7-btn-outline">
              <Target size={14} />
              New Goal
            </button>
            <button className="d7-btn d7-btn-primary">
              <Upload size={14} />
              Import CSV
            </button>
          </div>
        </header>

        {/* Feature */}
        <section className="d7-feature">
          <div className="d7-feature-main">
            <div className="d7-feature-kicker">Net Worth</div>
            <div className="d7-feature-amount">{formatCurrency(netWorth)}</div>
            <p className="d7-feature-deck">
              Your comprehensive financial overview. Track transactions, monitor goals, 
              and manage shared expenses with clarity and precision.
            </p>
          </div>
          <div className="d7-sidebar-stats">
            <div className="d7-sidebar-stat">
              <div className="d7-sidebar-stat-label">Monthly Income</div>
              <div className="d7-sidebar-stat-value income">{formatCurrency(stats.totalIncome)}</div>
            </div>
            <div className="d7-sidebar-stat">
              <div className="d7-sidebar-stat-label">Monthly Expenses</div>
              <div className="d7-sidebar-stat-value expense">{formatCurrency(stats.totalExpenses)}</div>
            </div>
            <div className="d7-sidebar-stat">
              <div className="d7-sidebar-stat-label">Savings Rate</div>
              <div className="d7-sidebar-stat-value rate">{stats.savingsRate.toFixed(1)}%</div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="d7-content">
          {/* Transactions */}
          <div className="d7-section">
            <div className="d7-section-header">
              <h2 className="d7-section-title">Recent Transactions</h2>
              <a href="#" className="d7-section-link">
                View All <ChevronRight size={12} />
              </a>
            </div>
            {transactions.map((tx) => {
              const date = new Date(tx.date);
              const day = date.getDate();
              const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
              return (
                <div key={tx.id} className="d7-tx">
                  <div className="d7-tx-date">
                    <div className="d7-tx-day">{day}</div>
                    <div className="d7-tx-month">{month}</div>
                  </div>
                  <div className="d7-tx-content">
                    <div className="d7-tx-desc">{tx.description}</div>
                    <div className="d7-tx-meta">
                      <span>{tx.account.name}</span>
                      <span className="d7-tx-tag">{tx.tags[0]?.name || 'Uncategorized'}</span>
                      {tx.split && (
                        <span className="d7-tx-split">
                          <Users size={11} />
                          {tx.split.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`d7-tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div>
            <div className="d7-section">
              <div className="d7-section-header">
                <h2 className="d7-section-title">Goals</h2>
                <a href="#" className="d7-section-link">
                  <Plus size={12} /> Add
                </a>
              </div>
              <div className="d7-goals">
                {goals.map((g) => (
                  <div key={g.goal.id} className="d7-goal">
                    <div className="d7-goal-header">
                      <div>
                        <div className="d7-goal-name">{g.goal.name}</div>
                        <div className="d7-goal-deadline">
                          {g.goal.deadline 
                            ? new Date(g.goal.deadline).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            : 'No deadline'}
                        </div>
                      </div>
                      <div className="d7-goal-percent">{g.percentage.toFixed(0)}%</div>
                    </div>
                    <div className="d7-goal-bar">
                      <div className="d7-goal-fill" style={{ width: `${g.percentage}%` }} />
                    </div>
                    <div className="d7-goal-amounts">
                      <span>{formatCurrency(g.currentAmount)} saved</span>
                      <span>{formatCurrency(g.goal.targetAmount)} goal</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="d7-actions">
                <button className="d7-action">
                  <Upload size={16} />
                  <span className="d7-action-label">Import</span>
                </button>
                <button className="d7-action">
                  <Target size={16} />
                  <span className="d7-action-label">Goal</span>
                </button>
                <button className="d7-action">
                  <Users size={16} />
                  <span className="d7-action-label">Split</span>
                </button>
              </div>

              {/* Callout */}
              <div className="d7-callout">
                <div className="d7-callout-title">
                  <Bookmark size={12} style={{ display: 'inline', marginRight: 6 }} />
                  Expense Splitting
                </div>
                <p className="d7-callout-text">
                  Share costs seamlessly. Mark any transaction as split and 
                  track pending reimbursements from friends and family.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
