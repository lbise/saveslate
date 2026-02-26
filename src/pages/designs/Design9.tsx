/**
 * Design 9: ART DECO DARK
 * 
 * Aesthetic: 1920s Art Deco inspired luxury
 * - Gold/brass on deep obsidian black
 * - Bodoni Moda + Raleway for geometric elegance
 * - Geometric patterns, subtle lines
 * - Symmetry, refined borders
 * - Gatsby-era financial sophistication
 * - Collapsible sidebar navigation
 */

import { useState } from 'react';
import {
  Upload,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Diamond,
  ChevronRight,
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

export function Design9() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const transactions = getTransactionsWithDetails().slice(0, 5);
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
          --d9-sidebar-width: 260px;
          --d9-sidebar-collapsed: 72px;
          
          font-family: 'Raleway', sans-serif;
          background: var(--d9-bg);
          color: var(--d9-text);
          min-height: 100vh;
          font-weight: 400;
          letter-spacing: 0.02em;
          display: flex;
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
          z-index: 0;
        }
        
        /* Sidebar */
        .d9-sidebar {
          width: var(--d9-sidebar-width);
          min-height: 100vh;
          background: var(--d9-surface);
          border-right: 1px solid var(--d9-border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          transition: width 0.25s ease;
          z-index: 100;
        }
        
        .d9-sidebar.collapsed {
          width: var(--d9-sidebar-collapsed);
        }
        
        .d9-sidebar-header {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--d9-border);
          position: relative;
        }
        
        .d9-sidebar-header::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 1px;
          background: var(--d9-gold);
        }
        
        .d9-sidebar.collapsed .d9-sidebar-header {
          padding: 24px 16px;
          justify-content: center;
        }
        
        .d9-sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
        }
        
        .d9-sidebar.collapsed .d9-sidebar-logo-text {
          display: none;
        }
        
        .d9-sidebar-logo-icon {
          color: var(--d9-gold);
          flex-shrink: 0;
        }
        
        .d9-sidebar-logo-text {
          font-family: 'Bodoni Moda', serif;
          font-size: 18px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        
        .d9-collapse-btn {
          width: 28px;
          height: 28px;
          border-radius: 0;
          background: transparent;
          border: 1px solid var(--d9-gold-dark);
          color: var(--d9-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s;
          flex-shrink: 0;
        }
        
        .d9-collapse-btn:hover {
          color: var(--d9-gold);
          border-color: var(--d9-gold);
        }
        
        .d9-sidebar.collapsed .d9-collapse-btn {
          transform: rotate(180deg);
        }
        
        .d9-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .d9-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 0;
          color: var(--d9-text-secondary);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          border-left: 2px solid transparent;
        }
        
        .d9-sidebar.collapsed .d9-nav-item {
          padding: 12px;
          justify-content: center;
          border-left: none;
        }
        
        .d9-nav-item:hover {
          background: rgba(212, 175, 55, 0.05);
          color: var(--d9-text);
        }
        
        .d9-nav-item.active {
          background: rgba(212, 175, 55, 0.08);
          color: var(--d9-gold);
          border-left-color: var(--d9-gold);
        }
        
        .d9-sidebar.collapsed .d9-nav-item.active {
          border-left: none;
        }
        
        .d9-nav-label {
          white-space: nowrap;
          overflow: hidden;
        }
        
        .d9-sidebar.collapsed .d9-nav-label {
          display: none;
        }
        
        .d9-nav-icon {
          flex-shrink: 0;
        }
        
        .d9-nav-section {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--d9-border);
        }
        
        .d9-user {
          padding: 16px;
          border-top: 1px solid var(--d9-border);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d9-sidebar.collapsed .d9-user {
          padding: 16px 12px;
          justify-content: center;
        }
        
        .d9-avatar {
          width: 36px;
          height: 36px;
          border-radius: 0;
          border: 1px solid var(--d9-gold-dark);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bodoni Moda', serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--d9-gold);
          flex-shrink: 0;
        }
        
        .d9-user-info {
          flex: 1;
          min-width: 0;
        }
        
        .d9-sidebar.collapsed .d9-user-info {
          display: none;
        }
        
        .d9-user-name {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d9-user-email {
          font-size: 11px;
          color: var(--d9-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d9-logout-btn {
          width: 32px;
          height: 32px;
          border-radius: 0;
          background: transparent;
          border: none;
          color: var(--d9-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s;
        }
        
        .d9-sidebar.collapsed .d9-logout-btn {
          display: none;
        }
        
        .d9-logout-btn:hover {
          color: var(--d9-expense);
        }
        
        /* Main content */
        .d9-main-wrapper {
          flex: 1;
          margin-left: var(--d9-sidebar-width);
          transition: margin-left 0.25s ease;
          position: relative;
        }
        
        .d9-sidebar.collapsed ~ .d9-main-wrapper {
          margin-left: var(--d9-sidebar-collapsed);
        }
        
        .d9-container {
          max-width: 1060px;
          margin: 0 auto;
          padding: 48px 40px;
          position: relative;
        }
        
        .d9-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 56px;
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
        
        .d9-page-title {
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
        
        @media (max-width: 900px) {
          .d9-sidebar {
            width: var(--d9-sidebar-collapsed);
          }
          .d9-sidebar .d9-sidebar-logo-text,
          .d9-sidebar .d9-nav-label,
          .d9-sidebar .d9-user-info {
            display: none;
          }
          .d9-sidebar .d9-nav-item {
            padding: 12px;
            justify-content: center;
            border-left: none;
          }
          .d9-sidebar .d9-user {
            justify-content: center;
          }
          .d9-sidebar .d9-collapse-btn,
          .d9-sidebar .d9-logout-btn {
            display: none;
          }
          .d9-main-wrapper {
            margin-left: var(--d9-sidebar-collapsed) !important;
          }
          .d9-hero-amount {
            font-size: 42px;
          }
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`d9-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="d9-sidebar-header">
          <div className="d9-sidebar-logo">
            <Diamond className="d9-sidebar-logo-icon" size={18} />
            <span className="d9-sidebar-logo-text">MeloMoney</span>
          </div>
          <button 
            className="d9-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft size={14} />
          </button>
        </div>
        
        <nav className="d9-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`d9-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <item.icon size={18} className="d9-nav-icon" />
              <span className="d9-nav-label">{item.label}</span>
            </button>
          ))}
          
          <div className="d9-nav-section">
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                className={`d9-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <item.icon size={18} className="d9-nav-icon" />
                <span className="d9-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        
        <div className="d9-user">
          <div className="d9-avatar">JD</div>
          <div className="d9-user-info">
            <div className="d9-user-name">John Doe</div>
            <div className="d9-user-email">john@example.com</div>
          </div>
          <button className="d9-logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="d9-main-wrapper">
        <div className="d9-container">
          {/* Header */}
          <header className="d9-header">
            <h1 className="d9-page-title">Dashboard</h1>
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
                        <span className="d9-tx-tag">{tx.category.name}</span>
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
    </div>
  );
}
