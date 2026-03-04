/**
 * Design 3: SYNTHWAVE FINANCE
 * 
 * Aesthetic: Retro-futuristic 80s synthwave
 * - Neon colors on dark background
 * - Grid lines and geometric shapes
 * - Glowing effects, gradients
 * - Orbitron + Exo 2 fonts
 * - Scan lines and CRT effects
 * - Cyberpunk dashboard feel
 */

import { useState } from 'react';
import {
  Upload,
  Target,
  Users,
  TrendingUp,
  TrendingDown,
  Grid,
  ChevronRight,
  PlusCircle,
  Activity,
} from 'lucide-react';
import {
  getTransactionsWithDetails,
  getMonthlyStats,
  getGoalProgress,
  getNetWorth,
} from '../../lib/data-service';
import { formatCurrency } from '../../lib/utils';

export function Design3() {
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const transactions = getTransactionsWithDetails().slice(0, 7);
  const stats = getMonthlyStats();
  const goals = getGoalProgress();
  const netWorth = getNetWorth();

  return (
    <div className="design3-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&family=Exo+2:wght@300;400;500;600&display=swap');
        
        .design3-root {
          --d3-void: #0d0221;
          --d3-dark: #150734;
          --d3-surface: #1a0a3e;
          --d3-neon-pink: #ff2a6d;
          --d3-neon-cyan: #05d9e8;
          --d3-neon-purple: #d300c5;
          --d3-neon-yellow: #f9f002;
          --d3-text: #e0e0ff;
          --d3-muted: #8888aa;
          
          font-family: 'Exo 2', sans-serif;
          background: var(--d3-void);
          color: var(--d3-text);
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }
        
        /* Animated grid background */
        .design3-root::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            linear-gradient(transparent 0%, transparent 97%, var(--d3-neon-cyan) 97%, var(--d3-neon-cyan) 100%),
            linear-gradient(90deg, transparent 0%, transparent 97%, var(--d3-neon-cyan) 97%, var(--d3-neon-cyan) 100%);
          background-size: 60px 60px;
          opacity: 0.1;
          perspective: 500px;
          transform: rotateX(60deg);
          transform-origin: top;
          animation: gridMove 20s linear infinite;
          pointer-events: none;
        }
        
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 0 60px; }
        }
        
        /* Sun gradient */
        .design3-root::after {
          content: '';
          position: fixed;
          bottom: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: linear-gradient(
            to bottom,
            var(--d3-neon-pink) 0%,
            var(--d3-neon-purple) 50%,
            transparent 100%
          );
          border-radius: 50% 50% 0 0;
          opacity: 0.15;
          filter: blur(40px);
          pointer-events: none;
        }
        
        .d3-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 32px;
          position: relative;
          z-index: 1;
        }
        
        .d3-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 40px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.2);
        }
        
        .d3-logo {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .d3-logo-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, var(--d3-neon-pink), var(--d3-neon-purple));
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(255, 42, 109, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 42, 109, 0.5); }
          50% { box-shadow: 0 0 40px rgba(255, 42, 109, 0.8); }
        }
        
        .d3-logo-text {
          font-family: 'Orbitron', sans-serif;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(90deg, var(--d3-neon-cyan), var(--d3-neon-pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(5, 217, 232, 0.5);
        }
        
        .d3-logo-sub {
          font-size: 10px;
          letter-spacing: 4px;
          color: var(--d3-muted);
          text-transform: uppercase;
        }
        
        .d3-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border: 2px solid var(--d3-neon-cyan);
          background: transparent;
          color: var(--d3-neon-cyan);
          font-family: 'Orbitron', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        
        .d3-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(5, 217, 232, 0.3), transparent);
          transition: left 0.5s;
        }
        
        .d3-btn:hover::before {
          left: 100%;
        }
        
        .d3-btn:hover {
          background: rgba(5, 217, 232, 0.1);
          box-shadow: 0 0 30px rgba(5, 217, 232, 0.5);
        }
        
        /* Stats row */
        .d3-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        
        .d3-stat {
          background: linear-gradient(135deg, var(--d3-surface), var(--d3-dark));
          border: 1px solid rgba(5, 217, 232, 0.2);
          padding: 24px;
          position: relative;
          clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
        }
        
        .d3-stat::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, var(--d3-neon-cyan) 50%, transparent 50%);
          opacity: 0.5;
        }
        
        .d3-stat-label {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--d3-muted);
          margin-bottom: 12px;
        }
        
        .d3-stat-value {
          font-family: 'Orbitron', sans-serif;
          font-size: 26px;
          font-weight: 700;
        }
        
        .d3-stat-value.cyan { color: var(--d3-neon-cyan); text-shadow: 0 0 20px var(--d3-neon-cyan); }
        .d3-stat-value.pink { color: var(--d3-neon-pink); text-shadow: 0 0 20px var(--d3-neon-pink); }
        .d3-stat-value.yellow { color: var(--d3-neon-yellow); text-shadow: 0 0 20px var(--d3-neon-yellow); }
        .d3-stat-value.purple { color: var(--d3-neon-purple); text-shadow: 0 0 20px var(--d3-neon-purple); }
        
        /* Main grid */
        .d3-main-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }
        
        .d3-panel {
          background: linear-gradient(180deg, var(--d3-surface), var(--d3-dark));
          border: 1px solid rgba(5, 217, 232, 0.2);
          overflow: hidden;
        }
        
        .d3-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.2);
          background: rgba(0, 0, 0, 0.3);
        }
        
        .d3-panel-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--d3-neon-cyan);
        }
        
        /* Transactions */
        .d3-tx-list {
          max-height: 450px;
          overflow-y: auto;
        }
        
        .d3-tx {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .d3-tx:hover, .d3-tx.selected {
          background: rgba(5, 217, 232, 0.05);
          border-left: 3px solid var(--d3-neon-cyan);
        }
        
        .d3-tx-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
        }
        
        .d3-tx-icon.income {
          border-color: var(--d3-neon-cyan);
          color: var(--d3-neon-cyan);
        }
        
        .d3-tx-icon.expense {
          border-color: var(--d3-neon-pink);
          color: var(--d3-neon-pink);
        }
        
        .d3-tx-info {
          min-width: 0;
        }
        
        .d3-tx-desc {
          font-weight: 500;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .d3-tx-meta {
          font-size: 12px;
          color: var(--d3-muted);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .d3-tx-tag {
          padding: 2px 10px;
          border: 1px solid var(--d3-neon-purple);
          color: var(--d3-neon-purple);
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .d3-tx-amount {
          font-family: 'Orbitron', sans-serif;
          font-size: 16px;
          font-weight: 600;
        }
        
        .d3-tx-amount.income { color: var(--d3-neon-cyan); }
        .d3-tx-amount.expense { color: var(--d3-neon-pink); }
        
        /* Goals */
        .d3-goal {
          padding: 24px;
          border-bottom: 1px solid rgba(5, 217, 232, 0.1);
        }
        
        .d3-goal:last-child {
          border-bottom: none;
        }
        
        .d3-goal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .d3-goal-name {
          font-family: 'Orbitron', sans-serif;
          font-size: 14px;
          font-weight: 500;
        }
        
        .d3-goal-percent {
          font-family: 'Orbitron', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--d3-neon-yellow);
          text-shadow: 0 0 15px var(--d3-neon-yellow);
        }
        
        .d3-goal-bar {
          height: 6px;
          background: var(--d3-dark);
          border: 1px solid rgba(5, 217, 232, 0.2);
          margin-bottom: 12px;
          position: relative;
          overflow: hidden;
        }
        
        .d3-goal-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--d3-neon-cyan), var(--d3-neon-pink));
          box-shadow: 0 0 20px var(--d3-neon-cyan);
          position: relative;
        }
        
        .d3-goal-fill::after {
          content: '';
          position: absolute;
          right: 0;
          top: -4px;
          bottom: -4px;
          width: 4px;
          background: var(--d3-neon-cyan);
          box-shadow: 0 0 10px var(--d3-neon-cyan);
        }
        
        .d3-goal-amounts {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--d3-muted);
        }
        
        /* Quick actions */
        .d3-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          margin-top: 2px;
          background: rgba(5, 217, 232, 0.1);
        }
        
        .d3-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px 16px;
          background: var(--d3-surface);
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: var(--d3-muted);
        }
        
        .d3-action:hover {
          background: var(--d3-dark);
          color: var(--d3-neon-cyan);
        }
        
        .d3-action-label {
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        /* Scrollbar */
        .d3-tx-list::-webkit-scrollbar {
          width: 4px;
        }
        
        .d3-tx-list::-webkit-scrollbar-track {
          background: var(--d3-dark);
        }
        
        .d3-tx-list::-webkit-scrollbar-thumb {
          background: var(--d3-neon-cyan);
          box-shadow: 0 0 10px var(--d3-neon-cyan);
        }
        
        @media (max-width: 1024px) {
          .d3-stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .d3-main-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 640px) {
          .d3-stats-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="d3-container">
        {/* Header */}
        <header className="d3-header">
          <div className="d3-logo">
            <div className="d3-logo-icon">
              <Grid size={26} />
            </div>
            <div>
              <div className="d3-logo-text">SAVE SLATE</div>
              <div className="d3-logo-sub">Neon Finance System</div>
            </div>
          </div>
          <button className="d3-btn">
            <Upload size={16} />
            Upload CSV
          </button>
        </header>

        {/* Stats Row */}
        <div className="d3-stats-row">
          <div className="d3-stat">
            <div className="d3-stat-label">Total Balance</div>
            <div className="d3-stat-value cyan">{formatCurrency(netWorth)}</div>
          </div>
          <div className="d3-stat">
            <div className="d3-stat-label">Income Stream</div>
            <div className="d3-stat-value yellow">{formatCurrency(stats.totalIncome)}</div>
          </div>
          <div className="d3-stat">
            <div className="d3-stat-label">Outflow</div>
            <div className="d3-stat-value pink">{formatCurrency(stats.totalExpenses)}</div>
          </div>
          <div className="d3-stat">
            <div className="d3-stat-label">Save Rate</div>
            <div className="d3-stat-value purple">{stats.savingsRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="d3-main-grid">
          {/* Transactions */}
          <div className="d3-panel">
            <div className="d3-panel-header">
              <div className="d3-panel-title">
                <Activity size={18} />
                Transaction Log
              </div>
              <ChevronRight size={18} style={{ color: 'var(--d3-muted)' }} />
            </div>
            <div className="d3-tx-list">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`d3-tx ${selectedTx === tx.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTx(tx.id)}
                >
                  <div className={`d3-tx-icon ${tx.type}`}>
                    {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div className="d3-tx-info">
                    <div className="d3-tx-desc">{tx.description}</div>
                    <div className="d3-tx-meta">
                      <span>{tx.date}</span>
                      <span className="d3-tx-tag">{tx.category.name}</span>
                      {tx.split && (
                        <span className="d3-tx-tag" style={{ borderColor: 'var(--d3-neon-yellow)', color: 'var(--d3-neon-yellow)' }}>
                          SPLIT
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`d3-tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="d3-panel">
            <div className="d3-panel-header">
              <div className="d3-panel-title">
                <Target size={18} />
                Objectives
              </div>
              <PlusCircle size={18} style={{ color: 'var(--d3-neon-cyan)', cursor: 'pointer' }} />
            </div>
            
            {goals.map((g) => (
              <div key={g.goal.id} className="d3-goal">
                <div className="d3-goal-header">
                  <div className="d3-goal-name">{g.goal.name}</div>
                  <div className="d3-goal-percent">{g.percentage.toFixed(0)}%</div>
                </div>
                <div className="d3-goal-bar">
                  <div className="d3-goal-fill" style={{ width: `${g.percentage}%` }} />
                </div>
                <div className="d3-goal-amounts">
                  <span>{formatCurrency(g.currentAmount)}</span>
                  <span>Target: {formatCurrency(g.goal.targetAmount)}</span>
                </div>
              </div>
            ))}

            {/* Quick Actions */}
            <div className="d3-actions">
              <button className="d3-action">
                <Upload size={20} />
                <span className="d3-action-label">Import</span>
              </button>
              <button className="d3-action">
                <Target size={20} />
                <span className="d3-action-label">Goal</span>
              </button>
              <button className="d3-action">
                <Users size={20} />
                <span className="d3-action-label">Split</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
