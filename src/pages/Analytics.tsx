import { useState, useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui';
import { getTransactionsWithDetails } from '../data/mock';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import {
  ANALYTICS_COLORS,
  buildSankeyData,
  DATE_RANGE_OPTIONS,
} from '../lib/analytics';
import type { DateRangePeriod, SankeyNodeInput } from '../lib/analytics';
import type { DefaultLink } from '@nivo/sankey';

// ── Nivo theme (matches dark palette from index.css) ──────────

const nivoTheme = {
  text: {
    fill: ANALYTICS_COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'Satoshi, sans-serif',
  },
  tooltip: {
    container: {
      background: ANALYTICS_COLORS.surface,
      color: ANALYTICS_COLORS.text,
      border: `1px solid ${ANALYTICS_COLORS.border}`,
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '14px',
      fontFamily: 'Satoshi, sans-serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
  },
};

const SANKEY_LEGEND_ITEMS = [
  { label: 'Income Categories', color: ANALYTICS_COLORS.income },
  { label: 'Gross Income', color: ANALYTICS_COLORS.accent },
  { label: 'Total Expenses', color: ANALYTICS_COLORS.expense },
  { label: 'Savings', color: ANALYTICS_COLORS.goal },
  { label: 'Shortfall', color: ANALYTICS_COLORS.warning },
];

// ── Component ─────────────────────────────────────────────────

export function Analytics() {
  const [period, setPeriod] = useState<DateRangePeriod>('this-month');
  const transactions = useMemo(() => getTransactionsWithDetails(), []);

  const { nodes, links, summary } = useMemo(
    () => buildSankeyData(transactions, period),
    [transactions, period],
  );

  const hasData = nodes.length > 0 && links.length > 0;

  return (
    <div className="page-container">
      <PageHeader title="Analytics">
        <PeriodSelector value={period} onChange={setPeriod} />
      </PageHeader>

      {/* Sankey Chart */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Money Flow</h2>
          <span className="text-ui text-text-muted">
            Income to gross income to expenses and savings
          </span>
        </div>

        {hasData ? (
          <div className="card" style={{ padding: '24px 0 16px' }}>
            <div style={{ height: 520 }}>
              <ResponsiveSankey<SankeyNodeInput, DefaultLink>
                data={{ nodes, links }}
                margin={{ top: 16, right: 160, bottom: 16, left: 160 }}
                align="justify"
                sort="descending"
                colors={(node) => node.nodeColor}
                label={(node) => node.nodeLabel}
                theme={nivoTheme}
                nodeOpacity={1}
                nodeHoverOpacity={1}
                nodeHoverOthersOpacity={0.25}
                nodeThickness={16}
                nodeSpacing={14}
                nodeInnerPadding={2}
                nodeBorderWidth={0}
                nodeBorderRadius={3}
                linkOpacity={0.35}
                linkHoverOpacity={0.6}
                linkHoverOthersOpacity={0.08}
                linkContract={2}
                linkBlendMode="normal"
                enableLinkGradient
                enableLabels
                labelPosition="outside"
                labelPadding={12}
                labelOrientation="horizontal"
                labelTextColor={{ from: 'color', modifiers: [['brighter', 0.6]] }}
                valueFormat={(v) => formatCurrency(v)}
                animate
                motionConfig="gentle"
              />
            </div>

            <div className="mt-3 px-6 flex flex-wrap gap-x-4 gap-y-2">
              {SANKEY_LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="block w-2.5 h-2.5 rounded-(--radius-full)"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="text-ui text-text-secondary">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState period={period} />
        )}
      </section>

      {/* Summary Stats */}
      <section className="mt-10">
        <div className="flex flex-wrap gap-10">
          <StatCard label="Income" value={formatCurrency(summary.totalIncome)} dotColor="income" />
          <StatCard label="Expenses" value={formatCurrency(summary.totalExpenses)} dotColor="expense" />
          <StatCard label="Transfers" value={formatCurrency(summary.totalTransfers)} dotColor="transfer" />
          <StatCard
            label={summary.netSavings >= 0 ? 'Net Savings' : 'Shortfall'}
            value={formatCurrency(Math.abs(summary.netSavings))}
            dotColor="muted"
          />
        </div>
      </section>
    </div>
  );
}

// ── Period Selector ───────────────────────────────────────────

interface PeriodSelectorProps {
  value: DateRangePeriod;
  onChange: (period: DateRangePeriod) => void;
}

function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-surface rounded-md border border-border p-1">
      {DATE_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-sm text-ui font-medium transition-all duration-150',
            value === opt.value
              ? 'bg-surface-active text-text'
              : 'bg-transparent text-text-muted hover:text-text-secondary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────

function EmptyState({ period }: { period: DateRangePeriod }) {
  const periodLabel = DATE_RANGE_OPTIONS.find((o) => o.value === period)?.label ?? period;

  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center">
        <BarChart3 size={24} className="text-text-muted" />
      </div>
      <div className="text-center">
        <p className="text-body text-text mb-1">No data for {periodLabel}</p>
        <p className="text-ui text-text-muted">
          Import transactions to see your money flow visualized here.
        </p>
      </div>
    </div>
  );
}
