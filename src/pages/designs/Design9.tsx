/**
 * Design 9: ART DECO DARK
 * 
 * Aesthetic: 1920s Art Deco inspired luxury
 * - Gold/brass on deep obsidian black
 * - Bodoni Moda + Raleway for geometric elegance
 * - Geometric patterns, subtle lines
 * - Symmetry, refined borders
 * - Gatsby-era financial sophistication
 */

import {
  Upload,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Diamond,
  ChevronRight,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../data/mock';
import { formatCurrency } from '../../lib/utils';

export function Design9() {
  const transactions = getTransactionsWithDetails().slice(0, 5);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design9-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Raleway:wght@300;400;500;600&display=swap');
        
        .design9-root {
          --d9-bg: #0a0a0a;
          --d9-surface: #111111;
          --d9-surface-elevated: #171717;
          --d9-border: #2a2a2a;
          --d9-border-gold: #3d3422;
          --d9-text: #f5f5f5;
          --d9-text-secondary: #999999;
          --d9-text-muted: #555555;
          --d9-gold: #d4af37;
          --d9-gold-light: #e8c967;
          --d9-gold-dark: #a68a2a;
          --d9-income: #7eb88a;
          --d9-expense: #c97878;
          
          font-family: 'Raleway', sans-serif;
          background: var(--d9-bg);
          color: var(--d9-text);
          min-height: 100vh;
          font-weight: 400;
          letter-spacing: 0.02em;
        }
        
        /* Subtle geometric pattern overlay */
        .design9-root::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(30deg, var(--d9-border) 12%, transparent 12.5%, transparent 87%, var(--d9-border) 87.5%, var(--d9-border)),
            linear-gradient(150deg, var(--d9-border) 12%, transparent 12.5%, transparent 87%, var(--d9-border) 87.5%, var(--d9-border)),
            linear-gradient(30deg, var(--d9-border) 12%, transparent 12.5%, transparent 87%, var(--d9-border) 87.5%, var(--d9-border)),
            linear-gradient(150deg, var(--d9-border) 12%, transparent 12.5%, transparent 87%, var(--d9-border) 87.5%, var(--d9-border));
          background-size: 80px 140px;
          background-position: 0 0, 0 0, 40px 70px, 40px 70px;
          opacity: 0.03;
          pointer-events: none;
        }
        
        .d9-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 56px 48px;
          position: relative;
        }
        
        .d9-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 64px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--d9-border);
          position: relative;
        }
        
        .d9-header::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 1px;
          background: var(--d9-gold);
        }
        
        .d9-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d9-logo-mark {
          color: var(--d9-gold);
        }
        
        .d9-logo-text {
          font-family: 'Bodoni Moda', serif;
          font-size: 24px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        
        .d9-header-actions {
          display: flex;
          gap: 16px;
        }
        
        .d9-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 28px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s ease;
          border: none;
        }
        
        .d9-btn-primary {
          background: var(--d9-gold);
          color: var(--d9-bg);
        }
        
        .d9-btn-primary:hover {
          background: var(--d9-gold-light);
        }
        
        .d9-btn-outline {
          background: transparent;
          color: var(--d9-gold);
          border: 1px solid var(--d9-gold);
        }
        
        .d9-btn-outline:hover {
          background: var(--d9-gold);
          color: var(--d9-bg);
        }
        
        /* Hero */
        .d9-hero {
          text-align: center;
          margin-bottom: 64px;
          padding: 48px 0;
        }
        
        .d9-hero-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--d9-gold);
          margin-bottom: 16px;
        }
        
        .d9-hero-amount {
          font-family: 'Bodoni Moda', serif;
          font-size: 72px;
          font-weight: 400;
          letter-spacing: -0.02em;
          margin-bottom: 40px;
        }
        
        .d9-hero-divider {
          width: 120px;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--d9-gold), transparent);
          margin: 0 auto 40px;
        }
        
        .d9-hero-stats {
          display: flex;
          justify-content: center;
          gap: 64px;
        }
        
        .d9-hero-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .d9-hero-stat-value {
          font-family: 'Bodoni Moda', serif;
          font-size: 28px;
          font-weight: 400;
        }
        
        .d9-hero-stat-value.income { color: var(--d9-income); }
        .d9-hero-stat-value.expense { color: var(--d9-expense); }
        .d9-hero-stat-value.rate { color: var(--d9-gold); }
        
        .d9-hero-stat-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--d9-text-muted);
        }
        
        /* Main content */
        .d9-content {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 48px;
        }
        
        .d9-card {
          background: var(--d9-surface);
          border: 1px solid var(--d9-border);
          position: relative;
        }
        
        /* Decorative corners */
        .d9-card::before,
        .d9-card::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border: 1px solid var(--d9-gold-dark);
        }
        
        .d9-card::before {
          top: -1px;
          left: -1px;
          border-right: none;
          border-bottom: none;
        }
        
        .d9-card::after {
          bottom: -1px;
          right: -1px;
          border-left: none;
          border-top: none;
        }
        
        .d9-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          border-bottom: 1px solid var(--d9-border);
        }
        
        .d9-card-title {
          font-family: 'Bodoni Moda', serif;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        
        .d9-card-link {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--d9-gold);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.2s;
        }
        
        .d9-card-link:hover {
          opacity: 0.7;
        }
        
        /* Transactions */
        .d9-tx-list {
          padding: 8px 0;
        }
        
        .d9-tx {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px 28px;
          border-bottom: 1px solid var(--d9-border);
          transition: background 0.2s;
        }
        
        .d9-tx:last-child {
          border-bottom: none;
        }
        
        .d9-tx:hover {
          background: var(--d9-surface-elevated);
        }
        
        .d9-tx-icon {
          width: 40px;
          height: 40px;
          border: 1px solid var(--d9-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d9-tx-icon.income { 
          border-color: var(--d9-income);
          color: var(--d9-income); 
        }
        
        .d9-tx-icon.expense { 
          border-color: var(--d9-expense);
          color: var(--d9-expense); 
        }
        
        .d9-tx-info {
          flex: 1;
          min-width: 0;
        }
        
        .d9-tx-desc {
          font-weight: 500;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d9-tx-meta {
          font-size: 11px;
          color: var(--d9-text-muted);
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: 0.05em;
        }
        
        .d9-tx-tag {
          color: var(--d9-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 10px;
        }
        
        .d9-tx-split {
          color: var(--d9-gold-dark);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .d9-tx-amount {
          font-family: 'Bodoni Moda', serif;
          font-size: 18px;
        }
        
        .d9-tx-amount.income { color: var(--d9-income); }
        .d9-tx-amount.expense { color: var(--d9-expense); }
        
        /* Goals */
        .d9-goals {
          padding: 20px 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .d9-goal {
          padding: 20px;
          background: var(--d9-surface-elevated);
          border: 1px solid var(--d9-border);
          transition: border-color 0.2s;
        }
        
        .d9-goal:hover {
          border-color: var(--d9-gold-dark);
        }
        
        .d9-goal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .d9-goal-name {
          font-family: 'Bodoni Moda', serif;
          font-size: 15px;
          font-weight: 500;
        }
        
        .d9-goal-percent {
          font-family: 'Bodoni Moda', serif;
          font-size: 20px;
          color: var(--d9-gold);
        }
        
        .d9-goal-bar {
          height: 3px;
          background: var(--d9-border);
          margin-bottom: 12px;
          position: relative;
        }
        
        .d9-goal-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--d9-gold-dark), var(--d9-gold));
          transition: width 0.5s ease;
        }
        
        .d9-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--d9-text-muted);
          letter-spacing: 0.05em;
        }
        
        /* Actions */
        .d9-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid var(--d9-border);
        }
        
        .d9-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 24px 16px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          background: transparent;
          color: var(--d9-text-muted);
          border-right: 1px solid var(--d9-border);
        }
        
        .d9-action:last-child {
          border-right: none;
        }
        
        .d9-action:hover {
          background: var(--d9-surface-elevated);
          color: var(--d9-gold);
        }
        
        .d9-action-label {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        
        @media (max-width: 1024px) {
          .d9-content {
            grid-template-columns: 1fr;
          }
          .d9-hero-amount {
            font-size: 52px;
          }
          .d9-hero-stats {
            flex-wrap: wrap;
            gap: 32px;
          }
        }
      `}</style>

      <div className="d9-container">
        {/* Header */}
        <header className="d9-header">
          <div className="d9-logo">
            <Diamond className="d9-logo-mark" size={20} />
            <span className="d9-logo-text">MeloMoney</span>
          </div>
          <div className="d9-header-actions">
            <button className="d9-btn d9-btn-outline">
              <Target size={14} />
              New Goal
            </button>
            <button className="d9-btn d9-btn-primary">
              <Upload size={14} />
              Import CSV
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="d9-hero">
          <div className="d9-hero-label">Portfolio Value</div>
          <div className="d9-hero-amount">{formatCurrency(netWorth)}</div>
          <div className="d9-hero-divider" />
          <div className="d9-hero-stats">
            <div className="d9-hero-stat">
              <div className="d9-hero-stat-value income">{formatCurrency(stats.totalIncome)}</div>
              <div className="d9-hero-stat-label">Monthly Income</div>
            </div>
            <div className="d9-hero-stat">
              <div className="d9-hero-stat-value expense">{formatCurrency(stats.totalExpenses)}</div>
              <div className="d9-hero-stat-label">Monthly Expenses</div>
            </div>
            <div className="d9-hero-stat">
              <div className="d9-hero-stat-value rate">{stats.savingsRate.toFixed(1)}%</div>
              <div className="d9-hero-stat-label">Savings Rate</div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="d9-content">
          {/* Transactions */}
          <div className="d9-card">
            <div className="d9-card-header">
              <h2 className="d9-card-title">Transactions</h2>
              <a href="#" className="d9-card-link">
                View All <ChevronRight size={12} />
              </a>
            </div>
            <div className="d9-tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="d9-tx">
                  <div className={`d9-tx-icon ${tx.type}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div className="d9-tx-info">
                    <div className="d9-tx-desc">{tx.description}</div>
                    <div className="d9-tx-meta">
                      <span>{tx.date}</span>
                      <span className="d9-tx-tag">{tx.tags[0]?.name || 'Uncategorized'}</span>
                      {tx.split && (
                        <span className="d9-tx-split">
                          <Users size={10} />
                          Split
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`d9-tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="d9-card">
            <div className="d9-card-header">
              <h2 className="d9-card-title">Goals</h2>
              <a href="#" className="d9-card-link">
                <Plus size={12} /> Add
              </a>
            </div>
            <div className="d9-goals">
              {goals.map((g) => (
                <div key={g.goal.id} className="d9-goal">
                  <div className="d9-goal-header">
                    <span className="d9-goal-name">{g.goal.name}</span>
                    <span className="d9-goal-percent">{g.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="d9-goal-bar">
                    <div className="d9-goal-fill" style={{ width: `${g.percentage}%` }} />
                  </div>
                  <div className="d9-goal-amounts">
                    <span>{formatCurrency(g.currentAmount)}</span>
                    <span>{formatCurrency(g.goal.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="d9-actions">
              <button className="d9-action">
                <Upload size={16} />
                <span className="d9-action-label">Import</span>
              </button>
              <button className="d9-action">
                <Target size={16} />
                <span className="d9-action-label">Goal</span>
              </button>
              <button className="d9-action">
                <Users size={16} />
                <span className="d9-action-label">Split</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
