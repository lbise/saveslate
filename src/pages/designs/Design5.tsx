/**
 * Design 5: PLAYFUL FINANCE
 * 
 * Aesthetic: Toy-like, maximalist, joyful
 * - Bold colors, rounded shapes, playful animations
 * - Comic/cartoon-inspired (Nunito + Fredoka)
 * - Thick borders, drop shadows (claymorphism)
 * - Bouncy interactions, wiggle effects
 * - Emoji and icon heavy
 * - Card game / sticker collection feel
 */

import { useState } from 'react';
import {
  Upload,
  Target,
  Users,
  Star,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Plus,
  Zap,
  PartyPopper,
  PiggyBank,
  Rocket,
  Heart,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../data/mock';
import { formatCurrency } from '../../lib/utils';

export function Design5() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const transactions = getTransactionsWithDetails().slice(0, 6);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design5-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Fredoka:wght@400;500;600;700&display=swap');
        
        .design5-root {
          --d5-bg: #fff5eb;
          --d5-white: #ffffff;
          --d5-black: #2d2d2d;
          --d5-pink: #ff6b9d;
          --d5-pink-light: #ffd4e3;
          --d5-purple: #9b5de5;
          --d5-purple-light: #e4d4f7;
          --d5-blue: #00bbf9;
          --d5-blue-light: #d4f1fd;
          --d5-green: #00f5d4;
          --d5-green-dark: #00c4aa;
          --d5-yellow: #fee440;
          --d5-orange: #ff9f1c;
          --d5-red: #ff5a5f;
          
          font-family: 'Nunito', sans-serif;
          background: var(--d5-bg);
          color: var(--d5-black);
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        /* Fun background pattern */
        .design5-root::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 80%, var(--d5-pink-light) 0%, transparent 25%),
            radial-gradient(circle at 80% 20%, var(--d5-blue-light) 0%, transparent 25%),
            radial-gradient(circle at 40% 40%, var(--d5-purple-light) 0%, transparent 20%);
          pointer-events: none;
          opacity: 0.5;
        }
        
        .d5-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          position: relative;
        }
        
        .d5-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        
        .d5-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d5-logo-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--d5-pink), var(--d5-purple));
          border-radius: 16px;
          border: 4px solid var(--d5-black);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 4px 4px 0 var(--d5-black);
          animation: wiggle 3s ease-in-out infinite;
        }
        
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        
        .d5-logo-text {
          font-family: 'Fredoka', sans-serif;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--d5-purple), var(--d5-pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .d5-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: 100px;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          border: 3px solid var(--d5-black);
        }
        
        .d5-btn-primary {
          background: var(--d5-yellow);
          color: var(--d5-black);
          box-shadow: 4px 4px 0 var(--d5-black);
        }
        
        .d5-btn-primary:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 var(--d5-black);
        }
        
        .d5-btn-primary:active {
          transform: translate(2px, 2px);
          box-shadow: 0 0 0 var(--d5-black);
        }
        
        /* Hero card - big and fun */
        .d5-hero {
          background: linear-gradient(135deg, var(--d5-purple), var(--d5-blue));
          border-radius: 32px;
          border: 4px solid var(--d5-black);
          padding: 40px;
          color: white;
          margin-bottom: 32px;
          position: relative;
          overflow: hidden;
          box-shadow: 8px 8px 0 var(--d5-black);
        }
        
        .d5-hero-decoration {
          position: absolute;
          pointer-events: none;
        }
        
        .d5-hero-star1 { top: 20px; right: 100px; animation: spin 10s linear infinite; }
        .d5-hero-star2 { top: 60px; right: 40px; animation: spin 15s linear infinite reverse; }
        .d5-hero-star3 { bottom: 30px; right: 80px; animation: spin 12s linear infinite; }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .d5-hero-label {
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          opacity: 0.9;
        }
        
        .d5-hero-amount {
          font-family: 'Fredoka', sans-serif;
          font-size: 56px;
          font-weight: 700;
          margin-bottom: 24px;
          text-shadow: 4px 4px 0 rgba(0,0,0,0.2);
        }
        
        .d5-hero-stats {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        
        .d5-hero-stat {
          background: rgba(255,255,255,0.2);
          border-radius: 20px;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          backdrop-filter: blur(10px);
        }
        
        .d5-hero-stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d5-hero-stat-icon.income { background: var(--d5-green); color: var(--d5-black); }
        .d5-hero-stat-icon.expense { background: var(--d5-red); color: white; }
        .d5-hero-stat-icon.rate { background: var(--d5-yellow); color: var(--d5-black); }
        
        .d5-hero-stat-value {
          font-family: 'Fredoka', sans-serif;
          font-size: 24px;
          font-weight: 600;
        }
        
        .d5-hero-stat-label {
          font-size: 12px;
          opacity: 0.8;
        }
        
        /* Main grid */
        .d5-main {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }
        
        .d5-card {
          background: var(--d5-white);
          border-radius: 24px;
          border: 3px solid var(--d5-black);
          overflow: hidden;
          box-shadow: 6px 6px 0 var(--d5-black);
        }
        
        .d5-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 3px solid var(--d5-black);
          background: var(--d5-yellow);
        }
        
        .d5-card-title {
          font-family: 'Fredoka', sans-serif;
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        /* Transactions */
        .d5-tx-list {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .d5-tx {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--d5-bg);
          border-radius: 16px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .d5-tx:hover {
          border-color: var(--d5-black);
          transform: translateX(4px);
        }
        
        .d5-tx-emoji {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border: 2px solid var(--d5-black);
        }
        
        .d5-tx-emoji.income { background: var(--d5-green); }
        .d5-tx-emoji.expense { background: var(--d5-pink-light); }
        
        .d5-tx-info {
          flex: 1;
          min-width: 0;
        }
        
        .d5-tx-desc {
          font-weight: 700;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d5-tx-meta {
          font-size: 13px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .d5-tx-tag {
          background: var(--d5-purple-light);
          color: var(--d5-purple);
          padding: 2px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
        }
        
        .d5-tx-split {
          background: var(--d5-blue-light);
          color: var(--d5-blue);
          padding: 2px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .d5-tx-amount {
          font-family: 'Fredoka', sans-serif;
          font-size: 18px;
          font-weight: 600;
        }
        
        .d5-tx-amount.income { color: var(--d5-green-dark); }
        .d5-tx-amount.expense { color: var(--d5-red); }
        
        /* Goals */
        .d5-goals-header {
          background: var(--d5-pink);
          color: white;
        }
        
        .d5-goals-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .d5-goal {
          background: var(--d5-bg);
          border-radius: 20px;
          padding: 20px;
          border: 2px solid var(--d5-black);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .d5-goal:hover {
          transform: rotate(-1deg) scale(1.02);
          box-shadow: 4px 4px 0 var(--d5-black);
        }
        
        .d5-goal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .d5-goal-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          border: 2px solid var(--d5-black);
        }
        
        .d5-goal-info {
          flex: 1;
        }
        
        .d5-goal-name {
          font-weight: 800;
          margin-bottom: 2px;
        }
        
        .d5-goal-percent {
          font-family: 'Fredoka', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: var(--d5-purple);
        }
        
        .d5-goal-bar {
          height: 16px;
          background: var(--d5-white);
          border-radius: 100px;
          border: 2px solid var(--d5-black);
          overflow: hidden;
          margin-bottom: 12px;
        }
        
        .d5-goal-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--d5-green), var(--d5-blue));
          border-radius: 100px;
          transition: width 0.5s ease;
          position: relative;
        }
        
        .d5-goal-fill::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 8px;
          right: 8px;
          height: 4px;
          background: rgba(255,255,255,0.5);
          border-radius: 100px;
        }
        
        .d5-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 600;
        }
        
        /* Quick actions */
        .d5-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 20px;
          border-top: 3px solid var(--d5-black);
        }
        
        .d5-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 12px;
          background: var(--d5-bg);
          border-radius: 16px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .d5-action:hover {
          border-color: var(--d5-black);
          transform: translateY(-4px);
        }
        
        .d5-action:nth-child(1):hover { background: var(--d5-yellow); }
        .d5-action:nth-child(2):hover { background: var(--d5-green); }
        .d5-action:nth-child(3):hover { background: var(--d5-pink-light); }
        
        .d5-action-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .d5-action-label {
          font-size: 12px;
          font-weight: 800;
        }
        
        /* Fun badge */
        .d5-badge {
          position: absolute;
          top: -10px;
          right: 20px;
          background: var(--d5-yellow);
          color: var(--d5-black);
          padding: 8px 16px;
          border-radius: 100px;
          border: 2px solid var(--d5-black);
          font-size: 12px;
          font-weight: 800;
          box-shadow: 2px 2px 0 var(--d5-black);
          display: flex;
          align-items: center;
          gap: 6px;
          animation: bounce 2s ease-in-out infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @media (max-width: 1024px) {
          .d5-main {
            grid-template-columns: 1fr;
          }
          .d5-hero-amount {
            font-size: 40px;
          }
        }
      `}</style>

      <div className="d5-container">
        {/* Header */}
        <header className="d5-header">
          <div className="d5-logo">
            <div className="d5-logo-icon">
              <PiggyBank size={28} />
            </div>
            <span className="d5-logo-text">MeloMoney</span>
          </div>
          <button className="d5-btn d5-btn-primary">
            <Upload size={18} />
            Import CSV
          </button>
        </header>

        {/* Hero Card */}
        <div className="d5-hero">
          <Star className="d5-hero-decoration d5-hero-star1" size={32} />
          <Star className="d5-hero-decoration d5-hero-star2" size={24} />
          <Sparkles className="d5-hero-decoration d5-hero-star3" size={28} />
          
          <div className="d5-hero-label">
            <PartyPopper size={18} />
            Your Total Balance
          </div>
          <div className="d5-hero-amount">{formatCurrency(netWorth)}</div>
          
          <div className="d5-hero-stats">
            <div className="d5-hero-stat">
              <div className="d5-hero-stat-icon income">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="d5-hero-stat-value">{formatCurrency(stats.totalIncome)}</div>
                <div className="d5-hero-stat-label">Money In</div>
              </div>
            </div>
            <div className="d5-hero-stat">
              <div className="d5-hero-stat-icon expense">
                <TrendingDown size={20} />
              </div>
              <div>
                <div className="d5-hero-stat-value">{formatCurrency(stats.totalExpenses)}</div>
                <div className="d5-hero-stat-label">Money Out</div>
              </div>
            </div>
            <div className="d5-hero-stat">
              <div className="d5-hero-stat-icon rate">
                <Zap size={20} />
              </div>
              <div>
                <div className="d5-hero-stat-value">{stats.savingsRate.toFixed(0)}%</div>
                <div className="d5-hero-stat-label">Saved!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="d5-main">
          {/* Transactions */}
          <div className="d5-card">
            <div className="d5-card-header">
              <h2 className="d5-card-title">
                <Zap size={20} />
                Recent Activity
              </h2>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>View All →</span>
            </div>
            <div className="d5-tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="d5-tx">
                  <div className={`d5-tx-emoji ${tx.type}`}>
                    {tx.type === 'income' ? '💰' : '🛍️'}
                  </div>
                  <div className="d5-tx-info">
                    <div className="d5-tx-desc">{tx.description}</div>
                    <div className="d5-tx-meta">
                      <span>{tx.date}</span>
                      <span className="d5-tx-tag">{tx.tags[0]?.name || 'Other'}</span>
                      {tx.split && (
                        <span className="d5-tx-split">
                          <Users size={12} />
                          Split
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`d5-tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="d5-card" style={{ position: 'relative' }}>
            <div className="d5-badge">
              <Rocket size={14} />
              Goals!
            </div>
            <div className="d5-card-header d5-goals-header">
              <h2 className="d5-card-title">
                <Target size={20} />
                Dream Goals
              </h2>
              <Plus size={20} style={{ cursor: 'pointer' }} />
            </div>
            <div className="d5-goals-content">
              {goals.map((g, idx) => (
                <div 
                  key={g.goal.id} 
                  className="d5-goal"
                  onMouseEnter={() => setHoveredCard(g.goal.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="d5-goal-header">
                    <div 
                      className="d5-goal-icon"
                      style={{ background: idx === 0 ? 'var(--d5-blue-light)' : 'var(--d5-purple-light)' }}
                    >
                      {idx === 0 ? '🏖️' : '💻'}
                    </div>
                    <div className="d5-goal-info">
                      <div className="d5-goal-name">{g.goal.name}</div>
                    </div>
                    <div className="d5-goal-percent">{g.percentage.toFixed(0)}%</div>
                  </div>
                  <div className="d5-goal-bar">
                    <div 
                      className="d5-goal-fill" 
                      style={{ 
                        width: `${g.percentage}%`,
                        background: hoveredCard === g.goal.id 
                          ? 'linear-gradient(90deg, var(--d5-pink), var(--d5-purple))'
                          : undefined
                      }}
                    />
                  </div>
                  <div className="d5-goal-amounts">
                    <span>{formatCurrency(g.currentAmount)}</span>
                    <span style={{ color: '#888' }}>of {formatCurrency(g.goal.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="d5-actions">
              <button className="d5-action">
                <div className="d5-action-icon">
                  <Upload size={22} />
                </div>
                <span className="d5-action-label">Import</span>
              </button>
              <button className="d5-action">
                <div className="d5-action-icon">
                  <Target size={22} />
                </div>
                <span className="d5-action-label">New Goal</span>
              </button>
              <button className="d5-action">
                <div className="d5-action-icon">
                  <Heart size={22} />
                </div>
                <span className="d5-action-label">Split</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
