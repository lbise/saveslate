/**
 * Design 10: JAPANESE ZEN DARK
 * 
 * Aesthetic: Wabi-sabi inspired minimalism
 * - Muted earth tones on deep charcoal
 * - Noto Serif JP + Zen Kaku Gothic for subtle Japanese influence
 * - Asymmetric balance, intentional imperfection
 * - Stone, sand, bamboo color palette
 * - Restful, meditative finance experience
 */

import {
  Upload,
  Target,
  Users,
  ArrowUpRight,
  Plus,
  Circle,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../data/mock';
import { formatCurrency } from '../../lib/utils';

export function Design10() {
  const transactions = getTransactionsWithDetails().slice(0, 6);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design10-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,500;0,600;1,400&family=Zen+Kaku+Gothic+New:wght@300;400;500&display=swap');
        
        .design10-root {
          --d10-bg: #1a1917;
          --d10-surface: #222220;
          --d10-surface-warm: #28261f;
          --d10-border: #333330;
          --d10-text: #e8e6e0;
          --d10-text-secondary: #a8a6a0;
          --d10-text-muted: #686864;
          --d10-stone: #8c8a82;
          --d10-sand: #c4b99f;
          --d10-bamboo: #8a9a72;
          --d10-rust: #a67c5b;
          --d10-income: #95a88a;
          --d10-expense: #b08080;
          
          font-family: 'Zen Kaku Gothic New', sans-serif;
          background: var(--d10-bg);
          color: var(--d10-text);
          min-height: 100vh;
          font-weight: 400;
        }
        
        .d10-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 56px 48px;
        }
        
        .d10-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 72px;
        }
        
        .d10-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d10-logo-mark {
          color: var(--d10-sand);
          opacity: 0.8;
        }
        
        .d10-logo-text {
          font-family: 'Noto Serif', serif;
          font-size: 22px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        
        .d10-header-actions {
          display: flex;
          gap: 12px;
        }
        
        .d10-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          border-radius: 2px;
        }
        
        .d10-btn-primary {
          background: var(--d10-sand);
          color: var(--d10-bg);
        }
        
        .d10-btn-primary:hover {
          opacity: 0.85;
        }
        
        .d10-btn-ghost {
          background: transparent;
          color: var(--d10-text-secondary);
          border: 1px solid var(--d10-border);
        }
        
        .d10-btn-ghost:hover {
          border-color: var(--d10-sand);
          color: var(--d10-sand);
        }
        
        /* Balance section - asymmetric */
        .d10-hero {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 64px;
          margin-bottom: 64px;
          padding-bottom: 48px;
          border-bottom: 1px solid var(--d10-border);
        }
        
        .d10-hero-main {
          padding-top: 24px;
        }
        
        .d10-hero-label {
          font-size: 12px;
          color: var(--d10-text-muted);
          margin-bottom: 16px;
          letter-spacing: 0.05em;
        }
        
        .d10-hero-amount {
          font-family: 'Noto Serif', serif;
          font-size: 52px;
          font-weight: 400;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
          color: var(--d10-text);
        }
        
        .d10-hero-note {
          font-size: 14px;
          color: var(--d10-text-muted);
          line-height: 1.7;
          max-width: 400px;
          font-style: italic;
        }
        
        .d10-hero-stats {
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding: 28px;
          background: var(--d10-surface);
          border-left: 2px solid var(--d10-sand);
        }
        
        .d10-stat {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .d10-stat-label {
          font-size: 11px;
          color: var(--d10-text-muted);
          letter-spacing: 0.05em;
        }
        
        .d10-stat-value {
          font-family: 'Noto Serif', serif;
          font-size: 24px;
          font-weight: 400;
        }
        
        .d10-stat-value.income { color: var(--d10-income); }
        .d10-stat-value.expense { color: var(--d10-expense); }
        .d10-stat-value.rate { color: var(--d10-sand); }
        
        /* Main layout */
        .d10-main {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 48px;
        }
        
        .d10-section {
          margin-bottom: 48px;
        }
        
        .d10-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        
        .d10-section-title {
          font-family: 'Noto Serif', serif;
          font-size: 16px;
          font-weight: 500;
        }
        
        .d10-section-action {
          font-size: 12px;
          color: var(--d10-text-muted);
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
        }
        
        .d10-section-action:hover {
          color: var(--d10-sand);
        }
        
        /* Transactions */
        .d10-tx-list {
          display: flex;
          flex-direction: column;
        }
        
        .d10-tx {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 0;
          border-bottom: 1px solid var(--d10-border);
        }
        
        .d10-tx:last-child {
          border-bottom: none;
        }
        
        .d10-tx-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .d10-tx-dot.income { background: var(--d10-income); }
        .d10-tx-dot.expense { background: var(--d10-expense); }
        
        .d10-tx-info {
          flex: 1;
          min-width: 0;
        }
        
        .d10-tx-desc {
          font-size: 14px;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d10-tx-meta {
          font-size: 12px;
          color: var(--d10-text-muted);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .d10-tx-tag {
          color: var(--d10-stone);
        }
        
        .d10-tx-split {
          color: var(--d10-rust);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .d10-tx-amount {
          font-family: 'Noto Serif', serif;
          font-size: 15px;
        }
        
        .d10-tx-amount.income { color: var(--d10-income); }
        .d10-tx-amount.expense { color: var(--d10-expense); }
        
        /* Goals */
        .d10-goals {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .d10-goal {
          padding: 24px;
          background: var(--d10-surface);
          border-radius: 2px;
          transition: background 0.2s;
        }
        
        .d10-goal:hover {
          background: var(--d10-surface-warm);
        }
        
        .d10-goal-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .d10-goal-name {
          font-family: 'Noto Serif', serif;
          font-size: 15px;
          font-weight: 500;
        }
        
        .d10-goal-percent {
          font-family: 'Noto Serif', serif;
          font-size: 18px;
          color: var(--d10-sand);
        }
        
        .d10-goal-bar {
          height: 3px;
          background: var(--d10-border);
          border-radius: 1px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        
        .d10-goal-fill {
          height: 100%;
          background: var(--d10-bamboo);
          border-radius: 1px;
          transition: width 0.5s ease;
        }
        
        .d10-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--d10-text-muted);
        }
        
        /* Actions */
        .d10-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 28px;
        }
        
        .d10-action {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          background: var(--d10-surface);
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: var(--d10-text-secondary);
          font-size: 13px;
          text-align: left;
          width: 100%;
        }
        
        .d10-action:hover {
          background: var(--d10-surface-warm);
          color: var(--d10-text);
        }
        
        .d10-action-icon {
          color: var(--d10-stone);
        }
        
        /* Decorative elements */
        .d10-enso {
          position: fixed;
          bottom: 40px;
          right: 40px;
          width: 80px;
          height: 80px;
          border: 2px solid var(--d10-border);
          border-radius: 50%;
          opacity: 0.15;
          border-top-color: transparent;
          transform: rotate(-45deg);
        }
        
        @media (max-width: 1024px) {
          .d10-hero {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .d10-hero-stats {
            flex-direction: row;
            justify-content: space-between;
          }
          .d10-main {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="d10-container">
        {/* Header */}
        <header className="d10-header">
          <div className="d10-logo">
            <Circle className="d10-logo-mark" size={16} strokeWidth={1.5} />
            <span className="d10-logo-text">MeloMoney</span>
          </div>
          <div className="d10-header-actions">
            <button className="d10-btn d10-btn-ghost">
              <Target size={15} />
              New Goal
            </button>
            <button className="d10-btn d10-btn-primary">
              <Upload size={15} />
              Import
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="d10-hero">
          <div className="d10-hero-main">
            <div className="d10-hero-label">Total Balance</div>
            <div className="d10-hero-amount">{formatCurrency(netWorth)}</div>
            <p className="d10-hero-note">
              "Wealth is not about having a lot of money; it's about having a lot of options."
            </p>
          </div>
          <div className="d10-hero-stats">
            <div className="d10-stat">
              <div className="d10-stat-label">Income</div>
              <div className="d10-stat-value income">{formatCurrency(stats.totalIncome)}</div>
            </div>
            <div className="d10-stat">
              <div className="d10-stat-label">Expenses</div>
              <div className="d10-stat-value expense">{formatCurrency(stats.totalExpenses)}</div>
            </div>
            <div className="d10-stat">
              <div className="d10-stat-label">Savings</div>
              <div className="d10-stat-value rate">{stats.savingsRate.toFixed(1)}%</div>
            </div>
          </div>
        </section>

        {/* Main */}
        <div className="d10-main">
          {/* Transactions */}
          <div className="d10-section">
            <div className="d10-section-header">
              <h2 className="d10-section-title">Recent Activity</h2>
              <button className="d10-section-action">
                View all <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="d10-tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="d10-tx">
                  <div className={`d10-tx-dot ${tx.type}`} />
                  <div className="d10-tx-info">
                    <div className="d10-tx-desc">{tx.description}</div>
                    <div className="d10-tx-meta">
                      <span>{tx.date}</span>
                      <span className="d10-tx-tag">{tx.tags[0]?.name || 'Uncategorized'}</span>
                      {tx.split && (
                        <span className="d10-tx-split">
                          <Users size={11} />
                          Split
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`d10-tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="d10-section">
              <div className="d10-section-header">
                <h2 className="d10-section-title">Goals</h2>
                <button className="d10-section-action">
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="d10-goals">
                {goals.map((g) => (
                  <div key={g.goal.id} className="d10-goal">
                    <div className="d10-goal-header">
                      <span className="d10-goal-name">{g.goal.name}</span>
                      <span className="d10-goal-percent">{g.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="d10-goal-bar">
                      <div className="d10-goal-fill" style={{ width: `${g.percentage}%` }} />
                    </div>
                    <div className="d10-goal-amounts">
                      <span>{formatCurrency(g.currentAmount)}</span>
                      <span>{formatCurrency(g.goal.targetAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="d10-actions">
                <button className="d10-action">
                  <Upload size={16} className="d10-action-icon" />
                  Import transactions
                </button>
                <button className="d10-action">
                  <Target size={16} className="d10-action-icon" />
                  Create new goal
                </button>
                <button className="d10-action">
                  <Users size={16} className="d10-action-icon" />
                  Split expense
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative enso circle */}
      <div className="d10-enso" />
    </div>
  );
}
