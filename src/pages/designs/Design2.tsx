/**
 * Design 2: BOTANICAL FINANCE
 * 
 * Aesthetic: Organic, nature-inspired with botanical elements
 * - Serif + humanist sans typography (Fraunces + DM Sans)
 * - Warm earth tones, sage greens, soft terracotta
 * - Organic shapes, soft curves, leaf motifs
 * - Card layouts with generous padding
 * - Subtle paper textures
 * - Growth metaphors for financial progress
 */

import { useState } from 'react';
import {
  Upload,
  Target,
  Users,
  Leaf,
  Sun,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Sprout,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../lib/data-service';
import { formatCurrency } from '../../lib/utils';

export function Design2() {
  const [hoveredGoal, setHoveredGoal] = useState<string | null>(null);
  const transactions = getTransactionsWithDetails().slice(0, 6);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design2-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600&display=swap');
        
        .design2-root {
          --d2-cream: #faf7f2;
          --d2-paper: #f5f0e8;
          --d2-sage: #8b9a7d;
          --d2-sage-light: #c5d1bc;
          --d2-sage-dark: #5a6b4f;
          --d2-terracotta: #c4836a;
          --d2-terracotta-light: #e8c4b8;
          --d2-earth: #3d3929;
          --d2-earth-light: #6b6456;
          --d2-gold: #c9a954;
          
          font-family: 'DM Sans', sans-serif;
          background: var(--d2-cream);
          color: var(--d2-earth);
          min-height: 100vh;
          position: relative;
        }
        
        /* Subtle paper texture */
        .design2-root::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
        }
        
        .d2-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
          position: relative;
        }
        
        .d2-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 48px;
        }
        
        .d2-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d2-logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--d2-sage), var(--d2-sage-dark));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--d2-cream);
        }
        
        .d2-logo-text {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 600;
          color: var(--d2-earth);
          letter-spacing: -0.5px;
        }
        
        .d2-header-actions {
          display: flex;
          gap: 12px;
        }
        
        .d2-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        
        .d2-btn-primary {
          background: var(--d2-sage);
          color: var(--d2-cream);
        }
        
        .d2-btn-primary:hover {
          background: var(--d2-sage-dark);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 154, 125, 0.3);
        }
        
        .d2-btn-secondary {
          background: var(--d2-paper);
          color: var(--d2-earth);
          border: 1px solid var(--d2-sage-light);
        }
        
        .d2-btn-secondary:hover {
          border-color: var(--d2-sage);
        }
        
        /* Hero balance card */
        .d2-hero {
          background: linear-gradient(135deg, var(--d2-sage) 0%, var(--d2-sage-dark) 100%);
          border-radius: 32px;
          padding: 48px;
          color: var(--d2-cream);
          position: relative;
          overflow: hidden;
          margin-bottom: 32px;
        }
        
        .d2-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .d2-hero-label {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .d2-hero-amount {
          font-family: 'Fraunces', serif;
          font-size: 56px;
          font-weight: 600;
          letter-spacing: -2px;
          margin-bottom: 32px;
        }
        
        .d2-hero-stats {
          display: flex;
          gap: 48px;
        }
        
        .d2-hero-stat {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d2-hero-stat-icon {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d2-hero-stat-label {
          font-size: 12px;
          opacity: 0.7;
        }
        
        .d2-hero-stat-value {
          font-family: 'Fraunces', serif;
          font-size: 24px;
          font-weight: 500;
        }
        
        /* Main grid */
        .d2-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }
        
        .d2-card {
          background: var(--d2-paper);
          border-radius: 24px;
          padding: 28px;
          position: relative;
        }
        
        .d2-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        
        .d2-card-title {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .d2-card-title svg {
          color: var(--d2-sage);
        }
        
        .d2-view-all {
          font-size: 13px;
          color: var(--d2-sage-dark);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .d2-view-all:hover {
          text-decoration: underline;
        }
        
        /* Transactions */
        .d2-transaction {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--d2-sage-light);
        }
        
        .d2-transaction:last-child {
          border-bottom: none;
        }
        
        .d2-tx-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        
        .d2-tx-icon.income {
          background: rgba(201, 169, 84, 0.15);
          color: var(--d2-gold);
        }
        
        .d2-tx-icon.expense {
          background: var(--d2-terracotta-light);
          color: var(--d2-terracotta);
        }
        
        .d2-tx-info {
          flex: 1;
          min-width: 0;
        }
        
        .d2-tx-desc {
          font-weight: 500;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d2-tx-meta {
          font-size: 13px;
          color: var(--d2-earth-light);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .d2-tx-tag {
          background: var(--d2-sage-light);
          color: var(--d2-sage-dark);
          padding: 2px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .d2-tx-amount {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .d2-tx-amount.income {
          color: var(--d2-gold);
        }
        
        .d2-tx-amount.expense {
          color: var(--d2-terracotta);
        }
        
        /* Goals */
        .d2-goals-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .d2-goal {
          background: var(--d2-cream);
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .d2-goal:hover, .d2-goal.active {
          border-color: var(--d2-sage);
          transform: translateX(4px);
        }
        
        .d2-goal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .d2-goal-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--d2-sage-light);
          color: var(--d2-sage-dark);
        }
        
        .d2-goal-name {
          font-weight: 600;
          flex: 1;
        }
        
        .d2-goal-percent {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 600;
          color: var(--d2-sage);
        }
        
        .d2-goal-progress {
          height: 8px;
          background: var(--d2-paper);
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        
        .d2-goal-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--d2-sage-light), var(--d2-sage));
          border-radius: 100px;
          transition: width 0.5s ease;
        }
        
        .d2-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--d2-earth-light);
        }
        
        /* Quick actions */
        .d2-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 24px;
        }
        
        .d2-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 12px;
          background: var(--d2-cream);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          color: var(--d2-earth);
        }
        
        .d2-action:hover {
          background: var(--d2-sage-light);
        }
        
        .d2-action-icon {
          width: 40px;
          height: 40px;
          background: var(--d2-sage);
          color: var(--d2-cream);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d2-action-label {
          font-size: 12px;
          font-weight: 500;
        }
        
        /* Decorative leaf */
        .d2-leaf-decor {
          position: absolute;
          color: var(--d2-sage-light);
          opacity: 0.3;
        }
        
        @media (max-width: 1024px) {
          .d2-grid {
            grid-template-columns: 1fr;
          }
          .d2-hero-amount {
            font-size: 40px;
          }
          .d2-hero-stats {
            flex-wrap: wrap;
            gap: 24px;
          }
        }
      `}</style>

      <div className="d2-container">
        {/* Header */}
        <header className="d2-header">
          <div className="d2-logo">
            <div className="d2-logo-icon">
              <Leaf size={24} />
            </div>
            <span className="d2-logo-text">MeloMoney</span>
          </div>
          <div className="d2-header-actions">
            <button className="d2-btn d2-btn-secondary">
              <Target size={18} />
              New Goal
            </button>
            <button className="d2-btn d2-btn-primary">
              <Upload size={18} />
              Import CSV
            </button>
          </div>
        </header>

        {/* Hero Balance Card */}
        <div className="d2-hero">
          <Sprout className="d2-leaf-decor" size={120} style={{ top: 20, right: 40 }} />
          <div className="d2-hero-label">
            <Sun size={16} />
            Your Garden is Growing
          </div>
          <div className="d2-hero-amount">{formatCurrency(netWorth)}</div>
          <div className="d2-hero-stats">
            <div className="d2-hero-stat">
              <div className="d2-hero-stat-icon">
                <ArrowUpRight size={20} />
              </div>
              <div>
                <div className="d2-hero-stat-label">Cultivated (Income)</div>
                <div className="d2-hero-stat-value">{formatCurrency(stats.totalIncome)}</div>
              </div>
            </div>
            <div className="d2-hero-stat">
              <div className="d2-hero-stat-icon">
                <ArrowDownRight size={20} />
              </div>
              <div>
                <div className="d2-hero-stat-label">Spent</div>
                <div className="d2-hero-stat-value">{formatCurrency(stats.totalExpenses)}</div>
              </div>
            </div>
            <div className="d2-hero-stat">
              <div className="d2-hero-stat-icon">
                <Droplets size={20} />
              </div>
              <div>
                <div className="d2-hero-stat-label">Savings Rate</div>
                <div className="d2-hero-stat-value">{stats.savingsRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="d2-grid">
          {/* Transactions */}
          <div className="d2-card">
            <div className="d2-card-header">
              <h2 className="d2-card-title">
                <Leaf size={20} />
                Recent Activity
              </h2>
              <a href="#" className="d2-view-all">
                View all <ArrowUpRight size={14} />
              </a>
            </div>
            
            {transactions.map((tx) => (
              <div key={tx.id} className="d2-transaction">
                <div className={`d2-tx-icon ${tx.type}`}>
                  {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div className="d2-tx-info">
                  <div className="d2-tx-desc">{tx.description}</div>
                  <div className="d2-tx-meta">
                    <span>{tx.date}</span>
                    <span className="d2-tx-tag">{tx.category.name}</span>
                    {tx.split && (
                      <span className="d2-tx-tag" style={{ background: 'var(--d2-terracotta-light)' }}>
                        Split {tx.split.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`d2-tx-amount ${tx.type}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>

          {/* Goals */}
          <div className="d2-card">
            <div className="d2-card-header">
              <h2 className="d2-card-title">
                <Target size={20} />
                Growing Goals
              </h2>
              <button className="d2-btn d2-btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                <Plus size={14} /> Add
              </button>
            </div>
            
            <div className="d2-goals-grid">
              {goals.map((g) => (
                <div 
                  key={g.goal.id} 
                  className={`d2-goal ${hoveredGoal === g.goal.id ? 'active' : ''}`}
                  onMouseEnter={() => setHoveredGoal(g.goal.id)}
                  onMouseLeave={() => setHoveredGoal(null)}
                >
                  <div className="d2-goal-header">
                    <div className="d2-goal-icon">
                      <Target size={18} />
                    </div>
                    <span className="d2-goal-name">{g.goal.name}</span>
                    <span className="d2-goal-percent">{g.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="d2-goal-progress">
                    <div 
                      className="d2-goal-progress-fill" 
                      style={{ width: `${g.percentage}%` }}
                    />
                  </div>
                  <div className="d2-goal-amounts">
                    <span>{formatCurrency(g.currentAmount)} saved</span>
                    <span>of {formatCurrency(g.goal.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="d2-actions">
              <button className="d2-action">
                <div className="d2-action-icon">
                  <Upload size={18} />
                </div>
                <span className="d2-action-label">Import</span>
              </button>
              <button className="d2-action">
                <div className="d2-action-icon">
                  <Target size={18} />
                </div>
                <span className="d2-action-label">New Goal</span>
              </button>
              <button className="d2-action">
                <div className="d2-action-icon">
                  <Users size={18} />
                </div>
                <span className="d2-action-label">Split</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
