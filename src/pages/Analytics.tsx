import { useState, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveSankey } from '@nivo/sankey';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui';
import { getTransactionsWithDetails } from '../lib/data-service';
import { cn, formatCurrency } from '../lib/utils';
import { getDataProfileLabel, loadActiveDataProfile } from '../lib/data-profile';
import {
  ANALYTICS_COLORS,
  buildMonthlyIncomeExpenseSeries,
  buildSankeyData,
  DATE_RANGE_OPTIONS,
} from '../lib/analytics';
import type {
  DateRangePeriod,
  MonthlyIncomeExpensePoint,
  PeriodSummary,
  SankeyNodeInput,
} from '../lib/analytics';
import type { DefaultLink } from '@nivo/sankey';

// ── Nivo theme (matches dark palette from index.css) ──────────

const ANALYTICS_FONT_FAMILY = 'var(--font-body)';

const nivoTheme = {
  text: {
    fill: ANALYTICS_COLORS.textSecondary,
    fontSize: 13,
    fontFamily: ANALYTICS_FONT_FAMILY,
  },
  labels: {
    text: {
      fontFamily: ANALYTICS_FONT_FAMILY,
      fontSize: 13,
    },
  },
  tooltip: {
    container: {
      background: ANALYTICS_COLORS.surface,
      color: ANALYTICS_COLORS.text,
      border: `1px solid ${ANALYTICS_COLORS.border}`,
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '14px',
      fontFamily: ANALYTICS_FONT_FAMILY,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
  },
};

const SANKEY_LEGEND_ITEMS = [
  { label: 'Income Categories', color: ANALYTICS_COLORS.income },
  { label: 'Gross Income', color: ANALYTICS_COLORS.income },
  { label: 'Expenses (total + categories)', color: ANALYTICS_COLORS.expense },
  { label: 'Savings', color: ANALYTICS_COLORS.goal },
  { label: 'Shortfall', color: ANALYTICS_COLORS.warning },
];

const TARGET_BAR_AXIS_TICK_COUNT = 4;

const incomeExpenseTheme = {
  ...nivoTheme,
  axis: {
    ticks: {
      line: {
        stroke: 'transparent',
      },
      text: {
        fill: ANALYTICS_COLORS.transfer,
        fontSize: 12,
        fontFamily: ANALYTICS_FONT_FAMILY,
      },
    },
    legend: {
      text: {
        fill: ANALYTICS_COLORS.textSecondary,
        fontSize: 12,
        fontFamily: ANALYTICS_FONT_FAMILY,
      },
    },
  },
  grid: {
    line: {
      stroke: 'rgba(126, 154, 179, 0.24)',
      strokeWidth: 1,
    },
  },
};

const barTooltipStyle = {
  background: 'rgba(18, 18, 21, 0.96)',
  border: `1px solid ${ANALYTICS_COLORS.border}`,
  borderRadius: 8,
  padding: '8px 10px',
  boxShadow: '0 8px 18px rgba(0, 0, 0, 0.35)',
};

function formatYAxisValue(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildYAxisTicks(series: MonthlyIncomeExpensePoint[]): number[] {
  const maxValue = series.reduce((currentMax, point) => {
    return Math.max(currentMax, point.income, point.expenses);
  }, 0);

  if (maxValue <= 0) {
    return [0];
  }

  const roughStep = maxValue / TARGET_BAR_AXIS_TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;

  const snappedStep = normalizedStep <= 1
    ? 1
    : normalizedStep <= 2
      ? 2
      : normalizedStep <= 5
        ? 5
        : 10;

  const step = snappedStep * magnitude;
  const maxTick = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];

  for (let value = 0; value <= maxTick; value += step) {
    ticks.push(value);
  }

  return ticks;
}

// ── Component ─────────────────────────────────────────────────

export function Analytics() {
  const [period, setPeriod] = useState<DateRangePeriod>('this-month');
  const [activeProfileLabel] = useState(() => getDataProfileLabel(loadActiveDataProfile()));
  const transactions = useMemo(() => getTransactionsWithDetails(), []);

  const { nodes, links, summary } = useMemo(
    () => buildSankeyData(transactions, period),
    [transactions, period],
  );

  const monthlySeries = useMemo(
    () => buildMonthlyIncomeExpenseSeries(transactions, period),
    [transactions, period],
  );

  const monthlyYAxisTicks = useMemo(
    () => buildYAxisTicks(monthlySeries),
    [monthlySeries],
  );

  const hasData = nodes.length > 0 && links.length > 0;
  const hasMonthlyData = monthlySeries.some((point) => point.income > 0 || point.expenses > 0);

  return (
    <div className="page-container">
      <PageHeader title="Analytics">
        <PeriodSelector value={period} onChange={setPeriod} />
      </PageHeader>

      {/* Summary Stats */}
      <section className="card px-5 py-4 sm:px-6">
        <div className="flex items-center gap-8 overflow-x-auto whitespace-nowrap pb-1">
          <div className="shrink-0">
            <StatCard label="Income" value={formatCurrency(summary.totalIncome)} dotColor="income" />
          </div>
          <div className="shrink-0">
            <StatCard label="Expenses" value={formatCurrency(summary.totalExpenses)} dotColor="expense" />
          </div>
          <div className="shrink-0">
            <StatCard label="Transfers" value={formatCurrency(summary.totalTransfers)} dotColor="transfer" />
          </div>
          <div className="shrink-0">
            <StatCard
              label={summary.netSavings >= 0 ? 'Net Savings' : 'Shortfall'}
              value={formatCurrency(Math.abs(summary.netSavings))}
              dotColor="muted"
            />
          </div>
        </div>
      </section>

      {/* Sankey Chart */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Money Flow</h2>
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
          <EmptyState period={period} summary={summary} activeProfileLabel={activeProfileLabel} />
        )}
      </section>

      <section className="mt-10">
        <div className="section-header">
          <h2 className="section-title">Income vs Expenses</h2>
        </div>

        {hasMonthlyData ? (
          <div className="card" style={{ padding: '16px 20px 16px' }}>
            <div className="relative" style={{ height: 320 }}>
              <span className="pointer-events-none absolute left-0 top-0 z-10 text-ui text-text-muted">
                CHF
              </span>

              <ResponsiveBar<MonthlyIncomeExpensePoint>
                data={monthlySeries}
                keys={['income', 'expenses']}
                indexBy="monthLabel"
                margin={{ top: 12, right: 8, bottom: 40, left: 64 }}
                padding={0.28}
                groupMode="grouped"
                borderRadius={3}
                colors={({ id }) => (String(id) === 'income' ? ANALYTICS_COLORS.income : ANALYTICS_COLORS.expense)}
                axisTop={null}
                axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 10 }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 10,
                  tickValues: monthlyYAxisTicks,
                  format: (value: string | number) => formatYAxisValue(Number(value)),
                }}
                labelSkipWidth={100}
                labelSkipHeight={100}
                valueFormat={(value: string | number) => formatCurrency(Number(value))}
                theme={incomeExpenseTheme}
                enableGridY
                gridYValues={monthlyYAxisTicks}
                tooltip={(bar: import('@nivo/bar').BarTooltipProps<MonthlyIncomeExpensePoint>) => {
                  const data = bar.data as MonthlyIncomeExpensePoint;
                  const net = data.income - data.expenses;
                  return (
                    <div style={barTooltipStyle}>
                      <div className="text-ui text-text-muted mb-1">{String(bar.indexValue)}</div>
                      <div className="text-ui text-income">Income: {formatCurrency(data.income)}</div>
                      <div className="text-ui text-expense">Expenses: {formatCurrency(data.expenses)}</div>
                      <div className="text-ui text-text mt-1">Net: {formatCurrency(net)}</div>
                    </div>
                  );
                }}
                animate
                motionConfig="gentle"
              />
            </div>
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center gap-2 py-12">
            <p className="text-body text-text">No monthly income or expense data</p>
            <p className="text-ui text-text-muted">Try a wider date range or switch the data profile in settings.</p>
          </div>
        )}
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

function buildEmptyDiagnostics(summary: PeriodSummary): string[] {
  const diagnostics: string[] = [];

  if (summary.totalIncome === 0 && summary.totalExpenses === 0 && summary.totalTransfers > 0) {
    diagnostics.push('Only transfer activity exists in this range. Sankey currently visualizes income and expense flow.');
  }

  if (summary.totalIncome === 0 && summary.totalExpenses === 0 && summary.totalTransfers === 0) {
    diagnostics.push('No transactions were found for this date range.');
  }

  return diagnostics;
}

interface EmptyStateProps {
  period: DateRangePeriod;
  summary: PeriodSummary;
  activeProfileLabel: string;
}

function EmptyState({ period, summary, activeProfileLabel }: EmptyStateProps) {
  const periodLabel = DATE_RANGE_OPTIONS.find((o) => o.value === period)?.label ?? period;
  const diagnostics = buildEmptyDiagnostics(summary);

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
        <p className="text-ui text-text-muted mt-2">
          Active profile: {activeProfileLabel}
        </p>
        {diagnostics.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {diagnostics.map((diagnostic) => (
              <p key={diagnostic} className="text-ui text-text-secondary">
                {diagnostic}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
