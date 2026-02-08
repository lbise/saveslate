/**
 * Design 8: MINIMALIST NOIR
 * 
 * Aesthetic: Ultra-clean Scandinavian-inspired dark mode
 * - Almost monochromatic with single accent color
 * - Sora + DM Sans for clean, modern typography
 * - Maximum whitespace, minimal visual noise
 * - Subtle interactions, refined details
 * - Focus on content, not decoration
 */

import { useState } from 'react';
import {
  Upload,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
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
} from '../../data/mock';
import { formatCurrency } from '../../lib/utils';

export function Design8() {
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
    <div className="design8-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=DM+Sans:wght@400;500&display=swap');
        
        .design8-root {
          --d8-bg: #111111;
          --d8-surface: #161616;
          --d8-surface-hover: #1a1a1a;
          --d8-border: #252525;
          --d8-text: #ffffff;
          --d8-text-secondary: #888888;
          --d8-text-muted: #555555;
          --d8-accent: #ffffff;
          --d8-income: #6fcf97;
          --d8-expense: #eb5757;
          --d8-sidebar-width: 260px;
          --d8-sidebar-collapsed: 72px;
          
          font-family: 'DM Sans', sans-serif;
          background: var(--d8-bg);
          color: var(--d8-text);
          min-height: 100vh;
          display: flex;
        }
        
        /* Sidebar */
        .d8-sidebar {
          width: var(--d8-sidebar-width);
          min-height: 100vh;
          background: var(--d8-surface);
          border-right: 1px solid var(--d8-border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          transition: width 0.2s ease;
          z-index: 100;
        }
        
        .d8-sidebar.collapsed {
          width: var(--d8-sidebar-collapsed);
        }
        
        .d8-sidebar-header {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--d8-border);
        }
        
        .d8-sidebar.collapsed .d8-sidebar-header {
          padding: 24px 16px;
          justify-content: center;
        }
        
        .d8-logo {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.03em;
          white-space: nowrap;
          overflow: hidden;
        }
        
        .d8-sidebar.collapsed .d8-logo {
          display: none;
        }
        
        .d8-logo-mark {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 600;
          display: none;
        }
        
        .d8-sidebar.collapsed .d8-logo-mark {
          display: block;
        }
        
        .d8-collapse-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid var(--d8-border);
          color: var(--d8-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        
        .d8-collapse-btn:hover {
          color: var(--d8-text);
          border-color: var(--d8-text-muted);
        }
        
        .d8-sidebar.collapsed .d8-collapse-btn {
          transform: rotate(180deg);
        }
        
        .d8-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .d8-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--d8-text-secondary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }
        
        .d8-sidebar.collapsed .d8-nav-item {
          padding: 12px;
          justify-content: center;
        }
        
        .d8-nav-item:hover {
          background: var(--d8-surface-hover);
          color: var(--d8-text);
        }
        
        .d8-nav-item.active {
          background: var(--d8-bg);
          color: var(--d8-text);
        }
        
        .d8-nav-label {
          white-space: nowrap;
          overflow: hidden;
        }
        
        .d8-sidebar.collapsed .d8-nav-label {
          display: none;
        }
        
        .d8-nav-icon {
          flex-shrink: 0;
        }
        
        .d8-nav-section {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--d8-border);
        }
        
        .d8-nav-divider {
          height: 1px;
          background: var(--d8-border);
          margin: 12px 16px;
        }
        
        .d8-sidebar.collapsed .d8-nav-divider {
          margin: 12px 8px;
        }
        
        .d8-user {
          padding: 16px;
          border-top: 1px solid var(--d8-border);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d8-sidebar.collapsed .d8-user {
          padding: 16px 12px;
          justify-content: center;
        }
        
        .d8-avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--d8-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        .d8-user-info {
          flex: 1;
          min-width: 0;
        }
        
        .d8-sidebar.collapsed .d8-user-info {
          display: none;
        }
        
        .d8-user-name {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d8-user-email {
          font-size: 12px;
          color: var(--d8-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d8-logout-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: var(--d8-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        
        .d8-sidebar.collapsed .d8-logout-btn {
          display: none;
        }
        
        .d8-logout-btn:hover {
          color: var(--d8-expense);
          background: rgba(235, 87, 87, 0.1);
        }
        
        /* Main content */
        .d8-main-wrapper {
          flex: 1;
          margin-left: var(--d8-sidebar-width);
          transition: margin-left 0.2s ease;
        }
        
        .d8-sidebar.collapsed ~ .d8-main-wrapper {
          margin-left: var(--d8-sidebar-collapsed);
        }
        
        .d8-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 48px 40px;
        }
        
        .d8-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 56px;
        }
        
        .d8-page-title {
          font-family: 'Sora', sans-serif;
          font-size: 24px;
          font-weight: 500;
          letter-spacing: -0.02em;
        }
        
        .d8-header-actions {
          display: flex;
          gap: 12px;
        }
        
        .d8-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          border-radius: 6px;
        }
        
        .d8-btn-primary {
          background: var(--d8-accent);
          color: var(--d8-bg);
        }
        
        .d8-btn-primary:hover {
          opacity: 0.9;
        }
        
        .d8-btn-ghost {
          background: transparent;
          color: var(--d8-text-secondary);
        }
        
        .d8-btn-ghost:hover {
          color: var(--d8-text);
        }
        
        /* Balance section */
        .d8-balance {
          margin-bottom: 56px;
        }
        
        .d8-balance-label {
          font-size: 13px;
          color: var(--d8-text-muted);
          margin-bottom: 8px;
        }
        
        .d8-balance-amount {
          font-family: 'Sora', sans-serif;
          font-size: 48px;
          font-weight: 300;
          letter-spacing: -0.03em;
          margin-bottom: 28px;
        }
        
        .d8-stats-row {
          display: flex;
          gap: 40px;
        }
        
        .d8-stat {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d8-stat-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .d8-stat-dot.income { background: var(--d8-income); }
        .d8-stat-dot.expense { background: var(--d8-expense); }
        .d8-stat-dot.rate { background: var(--d8-text-secondary); }
        
        .d8-stat-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .d8-stat-value {
          font-family: 'Sora', sans-serif;
          font-size: 16px;
          font-weight: 500;
        }
        
        .d8-stat-label {
          font-size: 12px;
          color: var(--d8-text-muted);
        }
        
        /* Main layout */
        .d8-main {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 40px;
        }
        
        .d8-section {
          margin-bottom: 40px;
        }
        
        .d8-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .d8-section-title {
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--d8-text-secondary);
        }
        
        .d8-section-action {
          font-size: 12px;
          color: var(--d8-text-muted);
          cursor: pointer;
          transition: color 0.15s;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .d8-section-action:hover {
          color: var(--d8-text);
        }
        
        /* Transactions */
        .d8-tx-list {
          display: flex;
          flex-direction: column;
        }
        
        .d8-tx {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--d8-border);
          transition: opacity 0.15s;
        }
        
        .d8-tx:hover {
          opacity: 0.8;
        }
        
        .d8-tx:last-child {
          border-bottom: none;
        }
        
        .d8-tx-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--d8-surface);
        }
        
        .d8-tx-icon.income { color: var(--d8-income); }
        .d8-tx-icon.expense { color: var(--d8-expense); }
        
        .d8-tx-info {
          flex: 1;
          min-width: 0;
        }
        
        .d8-tx-desc {
          font-size: 13px;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d8-tx-meta {
          font-size: 11px;
          color: var(--d8-text-muted);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .d8-tx-split {
          color: var(--d8-text-secondary);
        }
        
        .d8-tx-amount {
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 500;
        }
        
        .d8-tx-amount.income { color: var(--d8-income); }
        .d8-tx-amount.expense { color: var(--d8-expense); }
        
        /* Goals */
        .d8-goals {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .d8-goal {
          padding: 16px;
          background: var(--d8-surface);
          border-radius: 10px;
          transition: background 0.15s;
          cursor: pointer;
        }
        
        .d8-goal:hover {
          background: var(--d8-surface-hover);
        }
        
        .d8-goal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .d8-goal-name {
          font-size: 13px;
          font-weight: 500;
        }
        
        .d8-goal-percent {
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          color: var(--d8-text-secondary);
        }
        
        .d8-goal-bar {
          height: 4px;
          background: var(--d8-border);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        
        .d8-goal-fill {
          height: 100%;
          background: var(--d8-text);
          border-radius: 2px;
          transition: width 0.4s ease;
        }
        
        .d8-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--d8-text-muted);
        }
        
        /* Actions */
        .d8-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 20px;
        }
        
        .d8-action {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--d8-surface);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          border: none;
          color: var(--d8-text-secondary);
          font-size: 12px;
          text-align: left;
          width: 100%;
        }
        
        .d8-action:hover {
          background: var(--d8-surface-hover);
          color: var(--d8-text);
        }
        
        .d8-action-icon {
          width: 28px;
          height: 28px;
          background: var(--d8-bg);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @media (max-width: 1100px) {
          .d8-main {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 900px) {
          .d8-sidebar {
            width: var(--d8-sidebar-collapsed);
          }
          .d8-sidebar .d8-logo,
          .d8-sidebar .d8-nav-label,
          .d8-sidebar .d8-user-info {
            display: none;
          }
          .d8-sidebar .d8-logo-mark {
            display: block;
          }
          .d8-sidebar .d8-nav-item {
            padding: 12px;
            justify-content: center;
          }
          .d8-sidebar .d8-user {
            justify-content: center;
          }
          .d8-sidebar .d8-collapse-btn,
          .d8-sidebar .d8-logout-btn {
            display: none;
          }
          .d8-main-wrapper {
            margin-left: var(--d8-sidebar-collapsed);
          }
          .d8-balance-amount {
            font-size: 36px;
          }
          .d8-stats-row {
            flex-wrap: wrap;
            gap: 20px;
          }
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`d8-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="d8-sidebar-header">
          <span className="d8-logo">MeloMoney</span>
          <span className="d8-logo-mark">M</span>
          <button 
            className="d8-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft size={14} />
          </button>
        </div>
        
        <nav className="d8-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`d8-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <item.icon size={18} className="d8-nav-icon" />
              <span className="d8-nav-label">{item.label}</span>
            </button>
          ))}
          
          <div className="d8-nav-section">
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                className={`d8-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <item.icon size={18} className="d8-nav-icon" />
                <span className="d8-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        
        <div className="d8-user">
          <div className="d8-avatar">JD</div>
          <div className="d8-user-info">
            <div className="d8-user-name">John Doe</div>
            <div className="d8-user-email">john@example.com</div>
          </div>
          <button className="d8-logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="d8-main-wrapper">
        <div className="d8-container">
          {/* Header */}
          <header className="d8-header">
            <h1 className="d8-page-title">Dashboard</h1>
            <div className="d8-header-actions">
              <button className="d8-btn d8-btn-ghost">
                <Target size={16} />
                New Goal
              </button>
              <button className="d8-btn d8-btn-primary">
                <Upload size={16} />
                Import
              </button>
            </div>
          </header>

          {/* Balance */}
          <section className="d8-balance">
            <div className="d8-balance-label">Total Balance</div>
            <div className="d8-balance-amount">{formatCurrency(netWorth)}</div>
            <div className="d8-stats-row">
              <div className="d8-stat">
                <div className="d8-stat-dot income" />
                <div className="d8-stat-content">
                  <div className="d8-stat-value">{formatCurrency(stats.totalIncome)}</div>
                  <div className="d8-stat-label">Income</div>
                </div>
              </div>
              <div className="d8-stat">
                <div className="d8-stat-dot expense" />
                <div className="d8-stat-content">
                  <div className="d8-stat-value">{formatCurrency(stats.totalExpenses)}</div>
                  <div className="d8-stat-label">Expenses</div>
                </div>
              </div>
              <div className="d8-stat">
                <div className="d8-stat-dot rate" />
                <div className="d8-stat-content">
                  <div className="d8-stat-value">{stats.savingsRate.toFixed(1)}%</div>
                  <div className="d8-stat-label">Savings Rate</div>
                </div>
              </div>
            </div>
          </section>

          {/* Main */}
          <div className="d8-main">
            {/* Transactions */}
            <div className="d8-section">
              <div className="d8-section-header">
                <h2 className="d8-section-title">Recent Activity</h2>
                <button className="d8-section-action">
                  View all <ArrowUpRight size={12} />
                </button>
              </div>
              <div className="d8-tx-list">
                {transactions.map((tx) => (
                  <div key={tx.id} className="d8-tx">
                    <div className={`d8-tx-icon ${tx.category.type}`}>
                      {tx.category.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div className="d8-tx-info">
                      <div className="d8-tx-desc">{tx.description}</div>
                      <div className="d8-tx-meta">
                        <span>{tx.category.name}</span>
                        {tx.split && <span className="d8-tx-split">· Split</span>}
                      </div>
                    </div>
                    <div className={`d8-tx-amount ${tx.category.type}`}>
                      {tx.category.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="d8-section">
                <div className="d8-section-header">
                  <h2 className="d8-section-title">Goals</h2>
                  <button className="d8-section-action">
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="d8-goals">
                  {goals.map((g) => (
                    <div key={g.goal.id} className="d8-goal">
                      <div className="d8-goal-header">
                        <span className="d8-goal-name">{g.goal.name}</span>
                        <span className="d8-goal-percent">{g.percentage.toFixed(0)}%</span>
                      </div>
                      <div className="d8-goal-bar">
                        <div className="d8-goal-fill" style={{ width: `${g.percentage}%` }} />
                      </div>
                      <div className="d8-goal-amounts">
                        <span>{formatCurrency(g.currentAmount)}</span>
                        <span>{formatCurrency(g.goal.targetAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="d8-actions">
                  <button className="d8-action">
                    <div className="d8-action-icon">
                      <Upload size={14} />
                    </div>
                    Import transactions from CSV
                  </button>
                  <button className="d8-action">
                    <div className="d8-action-icon">
                      <Target size={14} />
                    </div>
                    Create a new savings goal
                  </button>
                  <button className="d8-action">
                    <div className="d8-action-icon">
                      <Users size={14} />
                    </div>
                    Split an expense with others
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
