/**
 * Design 1: BRUTALIST TERMINAL
 * 
 * Aesthetic: Neo-brutalist with raw industrial vibes
 * - Monospace typography (JetBrains Mono)
 * - High contrast black/white with electric lime accents
 * - Hard edges, no border-radius
 * - ASCII-inspired decorative elements
 * - Dense information display
 * - Glitch/scan-line effects
 */

import { useState } from 'react';
import {
  Upload,
  Target,
  Users,
  ChevronRight,
  Terminal,
  Zap,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../lib/data-service';
import { formatCurrency } from '../../lib/utils';

export function Design1() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'goals' | 'splits'>('transactions');
  const transactions = getTransactionsWithDetails().slice(0, 8);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design1-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        .design1-root {
          --d1-bg: #0a0a0a;
          --d1-surface: #141414;
          --d1-border: #2a2a2a;
          --d1-text: #e0e0e0;
          --d1-muted: #666;
          --d1-accent: #c8ff00;
          --d1-income: #00ff88;
          --d1-expense: #ff3366;
          
          font-family: 'JetBrains Mono', monospace;
          background: var(--d1-bg);
          color: var(--d1-text);
          min-height: 100vh;
          padding: 24px;
          position: relative;
          overflow-x: hidden;
        }
        
        /* Scanline effect */
        .design1-root::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          );
          pointer-events: none;
          z-index: 1000;
        }
        
        .d1-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--d1-accent);
        }
        
        .d1-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d1-logo-text {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -1px;
          color: var(--d1-accent);
        }
        
        .d1-logo-sub {
          font-size: 10px;
          color: var(--d1-muted);
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        .d1-import-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--d1-accent);
          color: var(--d1-bg);
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: none;
          cursor: pointer;
          transition: all 0.1s;
        }
        
        .d1-import-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0 var(--d1-accent);
        }
        
        .d1-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2px;
          margin-bottom: 32px;
          background: var(--d1-border);
        }
        
        .d1-stat-card {
          background: var(--d1-surface);
          padding: 24px;
          position: relative;
        }
        
        .d1-stat-card::before {
          content: attr(data-index);
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          color: var(--d1-muted);
        }
        
        .d1-stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--d1-muted);
          margin-bottom: 8px;
        }
        
        .d1-stat-value {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -1px;
        }
        
        .d1-stat-value.income { color: var(--d1-income); }
        .d1-stat-value.expense { color: var(--d1-expense); }
        .d1-stat-value.accent { color: var(--d1-accent); }
        
        .d1-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        
        .d1-panel {
          background: var(--d1-surface);
          border: 1px solid var(--d1-border);
        }
        
        .d1-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--d1-border);
        }
        
        .d1-panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--d1-accent);
        }
        
        .d1-tabs {
          display: flex;
          gap: 0;
        }
        
        .d1-tab {
          padding: 8px 16px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--d1-muted);
          background: transparent;
          border: 1px solid var(--d1-border);
          cursor: pointer;
          transition: all 0.1s;
        }
        
        .d1-tab:hover {
          color: var(--d1-text);
        }
        
        .d1-tab.active {
          background: var(--d1-accent);
          color: var(--d1-bg);
          border-color: var(--d1-accent);
        }
        
        .d1-transaction-list {
          max-height: 500px;
          overflow-y: auto;
        }
        
        .d1-transaction {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 16px;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--d1-border);
          transition: background 0.1s;
        }
        
        .d1-transaction:hover {
          background: rgba(200, 255, 0, 0.05);
        }
        
        .d1-tx-index {
          font-size: 10px;
          color: var(--d1-muted);
          width: 24px;
        }
        
        .d1-tx-info {
          min-width: 0;
        }
        
        .d1-tx-desc {
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        
        .d1-tx-meta {
          font-size: 10px;
          color: var(--d1-muted);
          display: flex;
          gap: 8px;
        }
        
        .d1-tx-tag {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          background: var(--d1-border);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .d1-tx-amount {
          font-weight: 700;
          font-size: 14px;
          text-align: right;
        }
        
        .d1-tx-amount.income { color: var(--d1-income); }
        .d1-tx-amount.expense { color: var(--d1-expense); }
        
        .d1-tx-type {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 4px 8px;
          border: 1px solid currentColor;
        }
        
        .d1-goal {
          padding: 20px;
          border-bottom: 1px solid var(--d1-border);
        }
        
        .d1-goal:last-child {
          border-bottom: none;
        }
        
        .d1-goal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .d1-goal-name {
          font-size: 13px;
          font-weight: 500;
        }
        
        .d1-goal-amount {
          font-size: 11px;
          color: var(--d1-accent);
        }
        
        .d1-progress-bar {
          height: 8px;
          background: var(--d1-border);
          position: relative;
          overflow: hidden;
        }
        
        .d1-progress-fill {
          height: 100%;
          background: var(--d1-accent);
          transition: width 0.3s;
        }
        
        .d1-progress-text {
          font-size: 10px;
          color: var(--d1-muted);
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
        }
        
        .d1-ascii-border {
          font-size: 10px;
          color: var(--d1-border);
          margin: 16px 0;
          overflow: hidden;
          white-space: nowrap;
        }
        
        .d1-quick-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          margin-top: 24px;
          background: var(--d1-border);
        }
        
        .d1-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px 16px;
          background: var(--d1-surface);
          cursor: pointer;
          transition: all 0.1s;
          border: none;
          color: var(--d1-muted);
        }
        
        .d1-action:hover {
          background: var(--d1-accent);
          color: var(--d1-bg);
        }
        
        .d1-action-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Custom scrollbar */
        .d1-transaction-list::-webkit-scrollbar {
          width: 4px;
        }
        
        .d1-transaction-list::-webkit-scrollbar-track {
          background: var(--d1-border);
        }
        
        .d1-transaction-list::-webkit-scrollbar-thumb {
          background: var(--d1-accent);
        }
        
        @media (max-width: 1024px) {
          .d1-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .d1-main-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 640px) {
          .d1-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <header className="d1-header">
        <div className="d1-logo">
          <Terminal size={28} strokeWidth={2} />
          <div>
              <div className="d1-logo-text">SAVE_SLATE</div>
            <div className="d1-logo-sub">Financial Terminal v2.0</div>
          </div>
        </div>
        <button className="d1-import-btn">
          <Upload size={14} />
          Import CSV
        </button>
      </header>

      {/* Stats Grid */}
      <div className="d1-stats-grid">
        <div className="d1-stat-card" data-index="01">
          <div className="d1-stat-label">Net Worth</div>
          <div className="d1-stat-value accent">{formatCurrency(netWorth)}</div>
        </div>
        <div className="d1-stat-card" data-index="02">
          <div className="d1-stat-label">Monthly Income</div>
          <div className="d1-stat-value income">{formatCurrency(stats.totalIncome)}</div>
        </div>
        <div className="d1-stat-card" data-index="03">
          <div className="d1-stat-label">Monthly Expenses</div>
          <div className="d1-stat-value expense">{formatCurrency(stats.totalExpenses)}</div>
        </div>
        <div className="d1-stat-card" data-index="04">
          <div className="d1-stat-label">Savings Rate</div>
          <div className="d1-stat-value">{stats.savingsRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* ASCII decoration */}
      <div className="d1-ascii-border">
        {'═'.repeat(200)}
      </div>

      {/* Main Content Grid */}
      <div className="d1-main-grid">
        {/* Transactions Panel */}
        <div className="d1-panel">
          <div className="d1-panel-header">
            <div className="d1-panel-title">
              <Zap size={14} />
              Data Stream
            </div>
            <div className="d1-tabs">
              <button
                className={`d1-tab ${activeTab === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                Transactions
              </button>
              <button
                className={`d1-tab ${activeTab === 'goals' ? 'active' : ''}`}
                onClick={() => setActiveTab('goals')}
              >
                Goals
              </button>
              <button
                className={`d1-tab ${activeTab === 'splits' ? 'active' : ''}`}
                onClick={() => setActiveTab('splits')}
              >
                Splits
              </button>
            </div>
          </div>
          
          <div className="d1-transaction-list">
            {transactions.map((tx, idx) => (
              <div key={tx.id} className="d1-transaction">
                <div className="d1-tx-index">{String(idx + 1).padStart(2, '0')}</div>
                <div className="d1-tx-info">
                  <div className="d1-tx-desc">{tx.description}</div>
                  <div className="d1-tx-meta">
                    <span>{tx.date}</span>
                    <span>|</span>
                    <span>{tx.account.name}</span>
                    {tx.split && (
                      <>
                        <span>|</span>
                        <span style={{ color: tx.split.status === 'pending' ? '#ff3366' : '#00ff88' }}>
                          SPLIT_{tx.split.status.toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="d1-tx-tag">{tx.category.name}</div>
                <div className={`d1-tx-amount ${tx.type}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Panel */}
        <div className="d1-panel">
          <div className="d1-panel-header">
            <div className="d1-panel-title">
              <Target size={14} />
              Targets
            </div>
            <ChevronRight size={16} style={{ color: 'var(--d1-muted)' }} />
          </div>
          
          {goals.map((g) => (
            <div key={g.goal.id} className="d1-goal">
              <div className="d1-goal-header">
                <div className="d1-goal-name">{g.goal.name}</div>
                <div className="d1-goal-amount">{g.percentage.toFixed(0)}%</div>
              </div>
              <div className="d1-progress-bar">
                <div 
                  className="d1-progress-fill" 
                  style={{ width: `${g.percentage}%` }}
                />
              </div>
              <div className="d1-progress-text">
                <span>{formatCurrency(g.currentAmount)}</span>
                <span>{formatCurrency(g.goal.targetAmount)}</span>
              </div>
            </div>
          ))}

          {/* Quick Actions */}
          <div className="d1-quick-actions">
            <button className="d1-action">
              <Upload size={20} />
              <span className="d1-action-label">Import</span>
            </button>
            <button className="d1-action">
              <Target size={20} />
              <span className="d1-action-label">New Goal</span>
            </button>
            <button className="d1-action">
              <Users size={20} />
              <span className="d1-action-label">Split</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
