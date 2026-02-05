/**
 * Design 6: DARK ORGANIC
 * 
 * Aesthetic: Dark version of the botanical theme
 * - Deep forest greens, charcoal, warm amber accents
 * - Cormorant Garamond + Source Sans 3
 * - Organic shapes on dark canvas
 * - Subtle texture overlays
 * - Warm, inviting but sophisticated
 */

import {
  Upload,
  Target,
  Users,
  Leaf,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../data/mock';
import { formatCurrency } from '../../lib/utils';

export function Design6() {
  const transactions = getTransactionsWithDetails().slice(0, 6);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design6-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap');
        
        .design6-root {
          --d6-bg: #141614;
          --d6-surface: #1c1f1c;
          --d6-surface-light: #252825;
          --d6-border: #2f332f;
          --d6-text: #e8ebe8;
          --d6-text-secondary: #9ca39c;
          --d6-text-muted: #6b726b;
          --d6-forest: #3d5a45;
          --d6-forest-light: #4a6b52;
          --d6-amber: #d4a574;
          --d6-amber-muted: #b8956a;
          --d6-income: #7cb587;
          --d6-expense: #c47a7a;
          
          font-family: 'Source Sans 3', sans-serif;
          background: var(--d6-bg);
          color: var(--d6-text);
          min-height: 100vh;
          font-weight: 400;
          letter-spacing: 0.01em;
        }
        
        .d6-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 48px 32px;
        }
        
        .d6-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 56px;
        }
        
        .d6-logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .d6-logo-mark {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--d6-forest), var(--d6-forest-light));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--d6-text);
        }
        
        .d6-logo-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        
        .d6-header-actions {
          display: flex;
          gap: 12px;
        }
        
        .d6-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .d6-btn-primary {
          background: var(--d6-forest);
          color: var(--d6-text);
        }
        
        .d6-btn-primary:hover {
          background: var(--d6-forest-light);
        }
        
        .d6-btn-secondary {
          background: transparent;
          color: var(--d6-text-secondary);
          border: 1px solid var(--d6-border);
        }
        
        .d6-btn-secondary:hover {
          border-color: var(--d6-forest);
          color: var(--d6-text);
        }
        
        /* Hero section */
        .d6-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
          padding: 40px;
          background: var(--d6-surface);
          border-radius: 16px;
          border: 1px solid var(--d6-border);
        }
        
        .d6-hero-main {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .d6-hero-label {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--d6-amber);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .d6-hero-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 52px;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          color: var(--d6-text);
        }
        
        .d6-hero-change {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--d6-income);
        }
        
        .d6-hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        
        .d6-stat {
          padding: 24px;
          background: var(--d6-surface-light);
          border-radius: 12px;
        }
        
        .d6-stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        
        .d6-stat-icon.income { background: rgba(124, 181, 135, 0.15); color: var(--d6-income); }
        .d6-stat-icon.expense { background: rgba(196, 122, 122, 0.15); color: var(--d6-expense); }
        .d6-stat-icon.rate { background: rgba(212, 165, 116, 0.15); color: var(--d6-amber); }
        
        .d6-stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .d6-stat-label {
          font-size: 13px;
          color: var(--d6-text-muted);
        }
        
        /* Main layout */
        .d6-main {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 32px;
        }
        
        .d6-card {
          background: var(--d6-surface);
          border-radius: 16px;
          border: 1px solid var(--d6-border);
          overflow: hidden;
        }
        
        .d6-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid var(--d6-border);
        }
        
        .d6-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .d6-card-title svg {
          color: var(--d6-forest-light);
        }
        
        .d6-view-link {
          font-size: 13px;
          color: var(--d6-amber);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.2s;
        }
        
        .d6-view-link:hover {
          opacity: 0.8;
        }
        
        /* Transactions */
        .d6-tx-list {
          padding: 8px 0;
        }
        
        .d6-tx {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 28px;
          transition: background 0.2s;
        }
        
        .d6-tx:hover {
          background: var(--d6-surface-light);
        }
        
        .d6-tx-indicator {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d6-tx-indicator.income {
          background: rgba(124, 181, 135, 0.12);
          color: var(--d6-income);
        }
        
        .d6-tx-indicator.expense {
          background: rgba(196, 122, 122, 0.12);
          color: var(--d6-expense);
        }
        
        .d6-tx-info {
          flex: 1;
          min-width: 0;
        }
        
        .d6-tx-desc {
          font-weight: 500;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d6-tx-meta {
          font-size: 13px;
          color: var(--d6-text-muted);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d6-tx-tag {
          color: var(--d6-text-secondary);
          background: var(--d6-surface-light);
          padding: 2px 10px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .d6-tx-split {
          color: var(--d6-amber-muted);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }
        
        .d6-tx-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 600;
        }
        
        .d6-tx-amount.income { color: var(--d6-income); }
        .d6-tx-amount.expense { color: var(--d6-expense); }
        
        /* Goals */
        .d6-goals {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .d6-goal {
          padding: 20px;
          background: var(--d6-surface-light);
          border-radius: 12px;
          transition: all 0.2s;
        }
        
        .d6-goal:hover {
          background: var(--d6-border);
        }
        
        .d6-goal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .d6-goal-name {
          font-weight: 600;
        }
        
        .d6-goal-percent {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--d6-amber);
        }
        
        .d6-goal-bar {
          height: 6px;
          background: var(--d6-bg);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        
        .d6-goal-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--d6-forest), var(--d6-forest-light));
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        
        .d6-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--d6-text-muted);
        }
        
        /* Actions */
        .d6-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 20px;
          border-top: 1px solid var(--d6-border);
        }
        
        .d6-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 18px 12px;
          background: var(--d6-surface-light);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: var(--d6-text-secondary);
        }
        
        .d6-action:hover {
          background: var(--d6-forest);
          color: var(--d6-text);
        }
        
        .d6-action-label {
          font-size: 12px;
          font-weight: 500;
        }
        
        @media (max-width: 1024px) {
          .d6-hero {
            grid-template-columns: 1fr;
          }
          .d6-main {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="d6-container">
        {/* Header */}
        <header className="d6-header">
          <div className="d6-logo">
            <div className="d6-logo-mark">
              <Leaf size={22} />
            </div>
            <span className="d6-logo-text">MeloMoney</span>
          </div>
          <div className="d6-header-actions">
            <button className="d6-btn d6-btn-secondary">
              <Target size={16} />
              New Goal
            </button>
            <button className="d6-btn d6-btn-primary">
              <Upload size={16} />
              Import CSV
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="d6-hero">
          <div className="d6-hero-main">
            <div className="d6-hero-label">
              <Wallet size={14} />
              Total Balance
            </div>
            <div className="d6-hero-amount">{formatCurrency(netWorth)}</div>
            <div className="d6-hero-change">
              <TrendingUp size={16} />
              <span>+{stats.savingsRate.toFixed(1)}% savings this month</span>
            </div>
          </div>
          <div className="d6-hero-stats">
            <div className="d6-stat">
              <div className="d6-stat-icon income">
                <ArrowUpRight size={18} />
              </div>
              <div className="d6-stat-value">{formatCurrency(stats.totalIncome)}</div>
              <div className="d6-stat-label">Income</div>
            </div>
            <div className="d6-stat">
              <div className="d6-stat-icon expense">
                <ArrowDownRight size={18} />
              </div>
              <div className="d6-stat-value">{formatCurrency(stats.totalExpenses)}</div>
              <div className="d6-stat-label">Expenses</div>
            </div>
            <div className="d6-stat">
              <div className="d6-stat-icon rate">
                <TrendingUp size={18} />
              </div>
              <div className="d6-stat-value">{stats.savingsRate.toFixed(0)}%</div>
              <div className="d6-stat-label">Saved</div>
            </div>
          </div>
        </section>

        {/* Main */}
        <div className="d6-main">
          {/* Transactions */}
          <div className="d6-card">
            <div className="d6-card-header">
              <h2 className="d6-card-title">
                <Leaf size={18} />
                Recent Transactions
              </h2>
              <a href="#" className="d6-view-link">
                View all <ArrowUpRight size={14} />
              </a>
            </div>
            <div className="d6-tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="d6-tx">
                  <div className={`d6-tx-indicator ${tx.type}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div className="d6-tx-info">
                    <div className="d6-tx-desc">{tx.description}</div>
                    <div className="d6-tx-meta">
                      <span>{tx.date}</span>
                      <span className="d6-tx-tag">{tx.tags[0]?.name || 'Uncategorized'}</span>
                      {tx.split && (
                        <span className="d6-tx-split">
                          <Users size={12} />
                          Split
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`d6-tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="d6-card">
            <div className="d6-card-header">
              <h2 className="d6-card-title">
                <Target size={18} />
                Goals
              </h2>
              <button className="d6-btn d6-btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="d6-goals">
              {goals.map((g) => (
                <div key={g.goal.id} className="d6-goal">
                  <div className="d6-goal-header">
                    <span className="d6-goal-name">{g.goal.name}</span>
                    <span className="d6-goal-percent">{g.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="d6-goal-bar">
                    <div className="d6-goal-fill" style={{ width: `${g.percentage}%` }} />
                  </div>
                  <div className="d6-goal-amounts">
                    <span>{formatCurrency(g.currentAmount)}</span>
                    <span>{formatCurrency(g.goal.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="d6-actions">
              <button className="d6-action">
                <Upload size={18} />
                <span className="d6-action-label">Import</span>
              </button>
              <button className="d6-action">
                <Target size={18} />
                <span className="d6-action-label">Goal</span>
              </button>
              <button className="d6-action">
                <Users size={18} />
                <span className="d6-action-label">Split</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
