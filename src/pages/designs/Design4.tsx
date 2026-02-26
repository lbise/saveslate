/**
 * Design 4: EDITORIAL LUXE
 * 
 * Aesthetic: High-end editorial magazine style
 * - Sophisticated serif + clean sans combination (Playfair Display + Outfit)
 * - Monochromatic palette with gold accents
 * - Generous whitespace, editorial typography
 * - Asymmetric layouts, overlapping elements
 * - Subtle shadows and elegant borders
 * - Print magazine inspired hierarchy
 */

import {
  Upload,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MoveRight,
  Sparkles,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../lib/data-service';
import { formatCurrency } from '../../lib/utils';

export function Design4() {
  const transactions = getTransactionsWithDetails().slice(0, 5);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design4-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Outfit:wght@300;400;500;600&display=swap');
        
        .design4-root {
          --d4-white: #ffffff;
          --d4-offwhite: #fafaf8;
          --d4-cream: #f5f4f0;
          --d4-black: #1a1a1a;
          --d4-charcoal: #2d2d2d;
          --d4-gray: #6b6b6b;
          --d4-light-gray: #e8e8e6;
          --d4-gold: #c4a35a;
          --d4-gold-light: #e8d5a8;
          --d4-success: #2d5a3f;
          --d4-danger: #8b3a3a;
          
          font-family: 'Outfit', sans-serif;
          background: var(--d4-offwhite);
          color: var(--d4-black);
          min-height: 100vh;
          font-weight: 400;
        }
        
        .d4-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 40px;
        }
        
        .d4-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 80px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--d4-light-gray);
        }
        
        .d4-masthead {
          display: flex;
          flex-direction: column;
        }
        
        .d4-issue {
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--d4-gray);
          margin-bottom: 8px;
        }
        
        .d4-logo {
          font-family: 'Playfair Display', serif;
          font-size: 42px;
          font-weight: 500;
          letter-spacing: -1px;
          line-height: 1;
        }
        
        .d4-logo span {
          font-style: italic;
          color: var(--d4-gold);
        }
        
        .d4-header-actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        
        .d4-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        
        .d4-btn-primary {
          background: var(--d4-black);
          color: var(--d4-white);
        }
        
        .d4-btn-primary:hover {
          background: var(--d4-charcoal);
        }
        
        .d4-btn-outline {
          background: transparent;
          color: var(--d4-black);
          border: 1px solid var(--d4-black);
        }
        
        .d4-btn-outline:hover {
          background: var(--d4-black);
          color: var(--d4-white);
        }
        
        /* Hero section - editorial style */
        .d4-hero {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 80px;
          margin-bottom: 80px;
          align-items: center;
        }
        
        .d4-hero-content {
          position: relative;
        }
        
        .d4-hero-label {
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--d4-gold);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .d4-hero-amount {
          font-family: 'Playfair Display', serif;
          font-size: 72px;
          font-weight: 400;
          letter-spacing: -3px;
          line-height: 1;
          margin-bottom: 24px;
        }
        
        .d4-hero-subtext {
          font-size: 16px;
          color: var(--d4-gray);
          max-width: 400px;
          line-height: 1.7;
        }
        
        .d4-stats-editorial {
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-left: 40px;
          border-left: 1px solid var(--d4-light-gray);
        }
        
        .d4-stat-editorial {
          display: flex;
          align-items: baseline;
          gap: 16px;
        }
        
        .d4-stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 400;
          letter-spacing: -1px;
        }
        
        .d4-stat-value.income { color: var(--d4-success); }
        .d4-stat-value.expense { color: var(--d4-danger); }
        .d4-stat-value.rate { color: var(--d4-gold); }
        
        .d4-stat-label {
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--d4-gray);
        }
        
        /* Two column layout */
        .d4-columns {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 60px;
        }
        
        .d4-section {
          margin-bottom: 48px;
        }
        
        .d4-section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--d4-light-gray);
        }
        
        .d4-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 500;
        }
        
        .d4-section-link {
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--d4-gray);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
        }
        
        .d4-section-link:hover {
          color: var(--d4-black);
        }
        
        /* Transactions - editorial list */
        .d4-tx-list {
          display: flex;
          flex-direction: column;
        }
        
        .d4-tx {
          display: grid;
          grid-template-columns: 60px 1fr auto;
          gap: 24px;
          align-items: center;
          padding: 24px 0;
          border-bottom: 1px solid var(--d4-light-gray);
        }
        
        .d4-tx:last-child {
          border-bottom: none;
        }
        
        .d4-tx-date {
          text-align: center;
        }
        
        .d4-tx-day {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 400;
          line-height: 1;
        }
        
        .d4-tx-month {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--d4-gray);
        }
        
        .d4-tx-content {
          min-width: 0;
        }
        
        .d4-tx-desc {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        
        .d4-tx-meta {
          font-size: 12px;
          color: var(--d4-gray);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d4-tx-tag {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 4px 12px;
          background: var(--d4-cream);
          border: 1px solid var(--d4-light-gray);
        }
        
        .d4-tx-split {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 4px 12px;
          background: var(--d4-gold-light);
          color: var(--d4-charcoal);
        }
        
        .d4-tx-amount {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 400;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .d4-tx-amount.income { color: var(--d4-success); }
        .d4-tx-amount.expense { color: var(--d4-danger); }
        
        /* Goals - elegant cards */
        .d4-goals {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .d4-goal {
          background: var(--d4-white);
          padding: 28px;
          border: 1px solid var(--d4-light-gray);
          transition: all 0.3s ease;
        }
        
        .d4-goal:hover {
          border-color: var(--d4-gold);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
        }
        
        .d4-goal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .d4-goal-info h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .d4-goal-info span {
          font-size: 12px;
          color: var(--d4-gray);
        }
        
        .d4-goal-percent {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 400;
          color: var(--d4-gold);
        }
        
        .d4-goal-bar {
          height: 3px;
          background: var(--d4-cream);
          margin-bottom: 16px;
          position: relative;
        }
        
        .d4-goal-fill {
          height: 100%;
          background: var(--d4-gold);
          transition: width 0.5s ease;
        }
        
        .d4-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        
        .d4-goal-amounts span:first-child {
          font-weight: 500;
        }
        
        .d4-goal-amounts span:last-child {
          color: var(--d4-gray);
        }
        
        /* Quick actions */
        .d4-actions {
          display: flex;
          gap: 12px;
          margin-top: 32px;
        }
        
        .d4-action {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px 16px;
          background: var(--d4-white);
          border: 1px solid var(--d4-light-gray);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .d4-action:hover {
          border-color: var(--d4-black);
        }
        
        .d4-action-icon {
          width: 40px;
          height: 40px;
          background: var(--d4-cream);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d4-action-label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        /* Callout */
        .d4-callout {
          background: var(--d4-black);
          color: var(--d4-white);
          padding: 40px;
          margin-top: 48px;
          position: relative;
          overflow: hidden;
        }
        
        .d4-callout-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          background: var(--d4-gold);
          color: var(--d4-black);
          padding: 6px 12px;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
        }
        
        .d4-callout h4 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 400;
          margin-bottom: 12px;
        }
        
        .d4-callout p {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
        }
        
        @media (max-width: 1024px) {
          .d4-hero {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .d4-columns {
            grid-template-columns: 1fr;
          }
          .d4-hero-amount {
            font-size: 52px;
          }
          .d4-stats-editorial {
            flex-direction: row;
            padding-left: 0;
            padding-top: 32px;
            border-left: none;
            border-top: 1px solid var(--d4-light-gray);
          }
        }
      `}</style>

      <div className="d4-container">
        {/* Header */}
        <header className="d4-header">
          <div className="d4-masthead">
            <div className="d4-issue">Personal Finance Edition</div>
            <div className="d4-logo">
              Melo<span>Money</span>
            </div>
          </div>
          <div className="d4-header-actions">
            <button className="d4-btn d4-btn-outline">
              <Target size={16} />
              New Goal
            </button>
            <button className="d4-btn d4-btn-primary">
              <Upload size={16} />
              Import CSV
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="d4-hero">
          <div className="d4-hero-content">
            <div className="d4-hero-label">
              <Sparkles size={14} />
              Your Portfolio
            </div>
            <div className="d4-hero-amount">{formatCurrency(netWorth)}</div>
            <p className="d4-hero-subtext">
              A curated view of your financial journey. Track expenses, 
              set goals, and build wealth with intention.
            </p>
          </div>
          <div className="d4-stats-editorial">
            <div className="d4-stat-editorial">
              <div className="d4-stat-value income">{formatCurrency(stats.totalIncome)}</div>
              <div className="d4-stat-label">Income</div>
            </div>
            <div className="d4-stat-editorial">
              <div className="d4-stat-value expense">{formatCurrency(stats.totalExpenses)}</div>
              <div className="d4-stat-label">Expenses</div>
            </div>
            <div className="d4-stat-editorial">
              <div className="d4-stat-value rate">{stats.savingsRate.toFixed(0)}%</div>
              <div className="d4-stat-label">Saved</div>
            </div>
          </div>
        </section>

        {/* Two Columns */}
        <div className="d4-columns">
          {/* Transactions */}
          <div className="d4-section">
            <div className="d4-section-header">
              <h2 className="d4-section-title">Recent Transactions</h2>
              <a href="#" className="d4-section-link">
                View All <MoveRight size={14} />
              </a>
            </div>
            <div className="d4-tx-list">
              {transactions.map((tx) => {
                const date = new Date(tx.date);
                const day = date.getDate();
                const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                return (
                  <div key={tx.id} className="d4-tx">
                    <div className="d4-tx-date">
                      <div className="d4-tx-day">{day}</div>
                      <div className="d4-tx-month">{month}</div>
                    </div>
                    <div className="d4-tx-content">
                      <div className="d4-tx-desc">{tx.description}</div>
                      <div className="d4-tx-meta">
                        <span>{tx.account.name}</span>
                        <span className="d4-tx-tag">{tx.category.name}</span>
                        {tx.split && (
                          <span className="d4-tx-split">Split {tx.split.status}</span>
                        )}
                      </div>
                    </div>
                    <div className={`d4-tx-amount ${tx.type}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goals Sidebar */}
          <div>
            <div className="d4-section">
              <div className="d4-section-header">
                <h2 className="d4-section-title">Aspirations</h2>
                <a href="#" className="d4-section-link">
                  <Plus size={14} /> Add
                </a>
              </div>
              <div className="d4-goals">
                {goals.map((g) => (
                  <div key={g.goal.id} className="d4-goal">
                    <div className="d4-goal-header">
                      <div className="d4-goal-info">
                        <h3>{g.goal.name}</h3>
                        <span>Deadline: {g.goal.deadline ? new Date(g.goal.deadline).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No deadline'}</span>
                      </div>
                      <div className="d4-goal-percent">{g.percentage.toFixed(0)}%</div>
                    </div>
                    <div className="d4-goal-bar">
                      <div className="d4-goal-fill" style={{ width: `${g.percentage}%` }} />
                    </div>
                    <div className="d4-goal-amounts">
                      <span>{formatCurrency(g.currentAmount)}</span>
                      <span>of {formatCurrency(g.goal.targetAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="d4-actions">
                <button className="d4-action">
                  <div className="d4-action-icon">
                    <Upload size={18} />
                  </div>
                  <span className="d4-action-label">Import</span>
                </button>
                <button className="d4-action">
                  <div className="d4-action-icon">
                    <Target size={18} />
                  </div>
                  <span className="d4-action-label">Goal</span>
                </button>
                <button className="d4-action">
                  <div className="d4-action-icon">
                    <Users size={18} />
                  </div>
                  <span className="d4-action-label">Split</span>
                </button>
              </div>

              {/* Callout */}
              <div className="d4-callout">
                <div className="d4-callout-badge">Pro Tip</div>
                <h4>Split expenses effortlessly</h4>
                <p>
                  Share costs with friends and family. Tag any transaction 
                  as split and track who owes what.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
