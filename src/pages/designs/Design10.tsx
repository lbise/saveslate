/**
 * Design 10: JAPANESE ZEN DARK
 * 
 * Aesthetic: Wabi-sabi inspired minimalism
 * - Muted earth tones on deep charcoal
 * - Noto Serif JP + Zen Kaku Gothic for subtle Japanese influence
 * - Asymmetric balance, intentional imperfection
 * - Stone, sand, bamboo color palette
 * - Restful, meditative finance experience
 * - Collapsible sidebar navigation
 */

import { useState } from 'react';
import {
  Upload,
  Target,
  Users,
  ArrowUpRight,
  Plus,
  Circle,
  LayoutDashboard,
  Receipt,
  Wallet,
  Tags,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../lib/data-service';
import { formatCurrency } from '../../lib/utils';

export function Design10() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const transactions = getTransactionsWithDetails().slice(0, 6);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'categories', label: 'Categories', icon: Tags },
  ];

  const bottomNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

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
          --d10-sidebar-width: 250px;
          --d10-sidebar-collapsed: 68px;
          
          font-family: 'Zen Kaku Gothic New', sans-serif;
          background: var(--d10-bg);
          color: var(--d10-text);
          min-height: 100vh;
          font-weight: 400;
          display: flex;
        }
        
        /* Sidebar */
        .d10-sidebar {
          width: var(--d10-sidebar-width);
          min-height: 100vh;
          background: var(--d10-surface);
          border-right: 1px solid var(--d10-border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          transition: width 0.3s ease;
          z-index: 100;
        }
        
        .d10-sidebar.collapsed {
          width: var(--d10-sidebar-collapsed);
        }
        
        .d10-sidebar-header {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--d10-border);
        }
        
        .d10-sidebar.collapsed .d10-sidebar-header {
          padding: 24px 14px;
          justify-content: center;
        }
        
        .d10-sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }
        
        .d10-sidebar-logo-icon {
          color: var(--d10-sand);
          opacity: 0.8;
          flex-shrink: 0;
        }
        
        .d10-sidebar-logo-text {
          font-family: 'Noto Serif', serif;
          font-size: 19px;
          font-weight: 500;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        
        .d10-sidebar.collapsed .d10-sidebar-logo-text {
          display: none;
        }
        
        .d10-collapse-btn {
          width: 28px;
          height: 28px;
          border-radius: 2px;
          background: transparent;
          border: 1px solid var(--d10-border);
          color: var(--d10-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          flex-shrink: 0;
        }
        
        .d10-collapse-btn:hover {
          color: var(--d10-text);
          border-color: var(--d10-sand);
        }
        
        .d10-sidebar.collapsed .d10-collapse-btn {
          transform: rotate(180deg);
        }
        
        .d10-nav {
          flex: 1;
          padding: 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .d10-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 2px;
          color: var(--d10-text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          border-left: 2px solid transparent;
        }
        
        .d10-sidebar.collapsed .d10-nav-item {
          padding: 11px;
          justify-content: center;
          border-left: none;
        }
        
        .d10-nav-item:hover {
          background: var(--d10-surface-warm);
          color: var(--d10-text);
        }
        
        .d10-nav-item.active {
          border-left-color: var(--d10-sand);
          color: var(--d10-text);
          background: var(--d10-surface-warm);
        }
        
        .d10-sidebar.collapsed .d10-nav-item.active {
          border-left: none;
          background: var(--d10-surface-warm);
        }
        
        .d10-nav-label {
          white-space: nowrap;
          overflow: hidden;
        }
        
        .d10-sidebar.collapsed .d10-nav-label {
          display: none;
        }
        
        .d10-nav-icon {
          flex-shrink: 0;
        }
        
        .d10-nav-section {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--d10-border);
        }
        
        .d10-user {
          padding: 16px;
          border-top: 1px solid var(--d10-border);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d10-sidebar.collapsed .d10-user {
          padding: 16px 10px;
          justify-content: center;
        }
        
        .d10-avatar {
          width: 34px;
          height: 34px;
          border-radius: 2px;
          background: var(--d10-surface-warm);
          border: 1px solid var(--d10-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Noto Serif', serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--d10-sand);
          flex-shrink: 0;
        }
        
        .d10-user-info {
          flex: 1;
          min-width: 0;
        }
        
        .d10-sidebar.collapsed .d10-user-info {
          display: none;
        }
        
        .d10-user-name {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d10-user-email {
          font-size: 11px;
          color: var(--d10-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d10-logout-btn {
          width: 30px;
          height: 30px;
          border-radius: 2px;
          background: transparent;
          border: none;
          color: var(--d10-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        
        .d10-sidebar.collapsed .d10-logout-btn {
          display: none;
        }
        
        .d10-logout-btn:hover {
          color: var(--d10-expense);
          background: rgba(176, 128, 128, 0.1);
        }
        
        /* Main content */
        .d10-main-wrapper {
          flex: 1;
          margin-left: var(--d10-sidebar-width);
          transition: margin-left 0.3s ease;
        }
        
        .d10-sidebar.collapsed ~ .d10-main-wrapper {
          margin-left: var(--d10-sidebar-collapsed);
        }
        
        .d10-container {
          max-width: 1040px;
          margin: 0 auto;
          padding: 48px 40px;
        }
        
        .d10-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 56px;
        }
        
        .d10-page-title {
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
        
        @media (max-width: 900px) {
          .d10-sidebar {
            width: var(--d10-sidebar-collapsed);
          }
          .d10-sidebar .d10-sidebar-logo-text,
          .d10-sidebar .d10-nav-label,
          .d10-sidebar .d10-user-info {
            display: none;
          }
          .d10-sidebar .d10-nav-item {
            padding: 11px;
            justify-content: center;
            border-left: none;
          }
          .d10-sidebar .d10-user {
            justify-content: center;
          }
          .d10-sidebar .d10-collapse-btn,
          .d10-sidebar .d10-logout-btn {
            display: none;
          }
          .d10-main-wrapper {
            margin-left: var(--d10-sidebar-collapsed) !important;
          }
          .d10-hero-amount {
            font-size: 38px;
          }
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`d10-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="d10-sidebar-header">
          <div className="d10-sidebar-logo">
            <Circle className="d10-sidebar-logo-icon" size={16} strokeWidth={1.5} />
            <span className="d10-sidebar-logo-text">MeloMoney</span>
          </div>
          <button 
            className="d10-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft size={14} />
          </button>
        </div>
        
        <nav className="d10-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`d10-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <item.icon size={18} className="d10-nav-icon" />
              <span className="d10-nav-label">{item.label}</span>
            </button>
          ))}
          
          <div className="d10-nav-section">
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                className={`d10-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <item.icon size={18} className="d10-nav-icon" />
                <span className="d10-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        
        <div className="d10-user">
          <div className="d10-avatar">JD</div>
          <div className="d10-user-info">
            <div className="d10-user-name">John Doe</div>
            <div className="d10-user-email">john@example.com</div>
          </div>
          <button className="d10-logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="d10-main-wrapper">
        <div className="d10-container">
          {/* Header */}
          <header className="d10-header">
            <h1 className="d10-page-title">Dashboard</h1>
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
                        <span className="d10-tx-tag">{tx.category.name}</span>
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
      </div>

      {/* Decorative enso circle */}
      <div className="d10-enso" />
    </div>
  );
}
