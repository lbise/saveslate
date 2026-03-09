import { useEffect, useMemo, useState } from 'react';
import { ResponsiveBar, type BarCustomLayerProps } from '@nivo/bar';
import { ResponsivePie, type PieCustomLayerProps } from '@nivo/pie';
import { ResponsiveSankey } from '@nivo/sankey';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui';
import { getGoalProgress, getTransactionsWithDetails } from '../lib/data-service';
import { cn } from '../lib/utils';
import { useFormatCurrency } from '../hooks';
import { getDataProfileLabel, loadActiveDataProfile } from '../lib/data-profile';
import {
  ANALYTICS_COLORS,
  buildGoalSavedSeries,
  buildCategoryPieSeries,
  buildMonthlyIncomeExpenseSeries,
  buildSankeyData,
  DATE_RANGE_OPTIONS,
} from '../lib/analytics';
import type {
  AnalyticsPieDatum,
  DateRangePeriod,
  GoalSavedPoint,
  MonthlyIncomeExpensePoint,
  PeriodSummary,
  SankeyNodeInput,
} from '../lib/analytics';
import type { DefaultLink } from '@nivo/sankey';

// ── Nivo theme (matches dark palette from index.css) ──────────

const ANALYTICS_FONT_FAMILY = 'Satoshi, ui-sans-serif, system-ui, sans-serif';
const ANALYTICS_DISPLAY_FONT_FAMILY = 'Poppins, ui-sans-serif, system-ui, sans-serif';

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
  legends: {
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

const pieTooltipStyle = {
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

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}…`;
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

function makeGoalSavedValueLabels(formatCurrency: (amount: number) => string) {
  return function GoalSavedValueLabels({ bars, innerWidth }: BarCustomLayerProps<GoalSavedPoint>) {
    return (
      <g pointerEvents="none">
        {bars.map((bar) => {
          const value = Number(bar.data.value ?? 0);
          const label = formatCurrency(value);
          const estimatedLabelWidth = label.length * 7;
          const outsideX = bar.x + bar.width + 8;
          const hasRoomOutside = outsideX + estimatedLabelWidth <= innerWidth;

          return (
            <text
              key={`${bar.key}-${bar.index}`}
              x={hasRoomOutside ? outsideX : Math.max(bar.x + 8, bar.x + bar.width - 8)}
              y={bar.y + bar.height / 2}
              textAnchor={hasRoomOutside ? 'start' : 'end'}
              dominantBaseline="central"
              style={{
                fill: hasRoomOutside ? ANALYTICS_COLORS.text : '#10243B',
                fontSize: 12,
                fontFamily: ANALYTICS_FONT_FAMILY,
                fontWeight: 600,
              }}
            >
              {label}
            </text>
          );
        })}
      </g>
    );
  };
}

interface PieCenterMetricLayerProps {
  total: number;
  activeSliceId: string | number | null;
}

function makePieCenterMetricLayer({ total, activeSliceId }: PieCenterMetricLayerProps) {
  return function PieCenterMetricLayer({ dataWithArc, centerX, centerY }: PieCustomLayerProps<AnalyticsPieDatum>) {
    const activeDatum = activeSliceId === null
      ? null
      : dataWithArc.find((datum) => datum.id === activeSliceId) ?? null;
    const share = activeDatum && total > 0 ? (activeDatum.value / total) * 100 : null;

    return (
      <g pointerEvents="none" transform={`translate(${centerX}, ${centerY})`}>
        <text
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: ANALYTICS_COLORS.text,
            fontFamily: ANALYTICS_DISPLAY_FONT_FAMILY,
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          {share === null ? '100%' : `${share.toFixed(1)}%`}
        </text>
        <text
          y={22}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: ANALYTICS_COLORS.textSecondary,
            fontFamily: ANALYTICS_FONT_FAMILY,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {activeDatum === null ? 'Total share' : String(activeDatum.label)}
        </text>
      </g>
    );
  };
}

// ── Component ─────────────────────────────────────────────────

export function Analytics() {
  const { formatCurrency } = useFormatCurrency();
  const [period, setPeriod] = useState<DateRangePeriod>('this-month');
  const [activeProfileLabel] = useState(() => getDataProfileLabel(loadActiveDataProfile()));
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const transactions = useMemo(() => getTransactionsWithDetails(), []);
  const goalProgress = useMemo(() => getGoalProgress(), []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { nodes, links, summary } = useMemo(
    () => buildSankeyData(transactions, period),
    [transactions, period],
  );

  const monthlySeries = useMemo(
    () => buildMonthlyIncomeExpenseSeries(transactions, period),
    [transactions, period],
  );

  const incomePieSeries = useMemo(
    () => buildCategoryPieSeries(transactions, period, 'income'),
    [transactions, period],
  );

  const expensePieSeries = useMemo(
    () => buildCategoryPieSeries(transactions, period, 'expense'),
    [transactions, period],
  );

  const goalSavedSeries = useMemo(
    () => buildGoalSavedSeries(goalProgress),
    [goalProgress],
  );

  const monthlyYAxisTicks = useMemo(
    () => buildYAxisTicks(monthlySeries),
    [monthlySeries],
  );

  const monthlyBarMaxValue = useMemo<number | 'auto'>(() => {
    if (monthlyYAxisTicks.length < 2) {
      return 'auto';
    }

    const step = monthlyYAxisTicks[1] - monthlyYAxisTicks[0];
    const topTick = monthlyYAxisTicks[monthlyYAxisTicks.length - 1];
    return topTick + step * 0.35;
  }, [monthlyYAxisTicks]);

  const monthlyAxisTicks = useMemo(() => {
    if (monthlyYAxisTicks.length <= 1) {
      return monthlyYAxisTicks;
    }
    return monthlyYAxisTicks.slice(0, -1);
  }, [monthlyYAxisTicks]);

  const GoalSavedValueLabels = useMemo(
    () => makeGoalSavedValueLabels(formatCurrency),
    [formatCurrency],
  );

  const hasData = nodes.length > 0 && links.length > 0;
  const hasMonthlyData = monthlySeries.some((point) => point.income > 0 || point.expenses > 0);
  const hasIncomePieData = incomePieSeries.length > 0;
  const hasExpensePieData = expensePieSeries.length > 0;
  const hasGoalSavedData = goalSavedSeries.some((goal) => goal.saved > 0);
  const totalGoalSaved = goalSavedSeries.reduce((sum, goal) => sum + goal.saved, 0);

  const isMobileViewport = viewportWidth < 640;
  const isNarrowViewport = viewportWidth < 1024;
  const sankeyChartMargin = isMobileViewport
    ? { top: 12, right: 86, bottom: 16, left: 86 }
    : isNarrowViewport
      ? { top: 16, right: 112, bottom: 16, left: 112 }
      : { top: 16, right: 160, bottom: 16, left: 160 };
  const sankeyChartHeight = isMobileViewport ? 460 : 520;
  const sankeyLabelMaxLength = isMobileViewport ? 9 : isNarrowViewport ? 18 : 26;
  const goalLabelMaxLength = isMobileViewport ? 12 : 22;

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
            <div style={{ height: sankeyChartHeight }}>
              <ResponsiveSankey<SankeyNodeInput, DefaultLink>
                data={{ nodes, links }}
                margin={sankeyChartMargin}
                align="justify"
                sort="descending"
                colors={(node) => node.nodeColor}
                label={(node) => truncateLabel(node.nodeLabel, sankeyLabelMaxLength)}
                theme={nivoTheme}
                nodeOpacity={1}
                nodeHoverOpacity={1}
                nodeHoverOthersOpacity={0.25}
                nodeThickness={isMobileViewport ? 12 : 16}
                nodeSpacing={isMobileViewport ? 10 : 14}
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
                labelPadding={isMobileViewport ? 8 : 12}
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
                margin={{ top: 32, right: 8, bottom: 40, left: 64 }}
                padding={0.28}
                groupMode="grouped"
                borderRadius={3}
                colors={({ id }) => (String(id) === 'income' ? ANALYTICS_COLORS.income : ANALYTICS_COLORS.expense)}
                valueScale={{ type: 'linear', max: monthlyBarMaxValue }}
                axisTop={null}
                axisRight={null}
                axisBottom={{ tickSize: 0, tickPadding: 10 }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 10,
                  tickValues: monthlyAxisTicks,
                  format: (value: string | number) => formatYAxisValue(Number(value)),
                }}
                labelSkipWidth={100}
                labelSkipHeight={100}
                valueFormat={(value: string | number) => formatCurrency(Number(value))}
                theme={incomeExpenseTheme}
                enableGridY
                gridYValues={monthlyAxisTicks}
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

      <section className="mt-10">
        <div className="section-header">
          <h2 className="section-title">Category Split</h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <PieCard
            title="Income Pie"
            emptyLabel="No income categories in this period"
            data={incomePieSeries}
            hasData={hasIncomePieData}
            formatCurrency={formatCurrency}
          />
          <PieCard
            title="Expense Breakdown"
            emptyLabel="No expense categories in this period"
            data={expensePieSeries}
            hasData={hasExpensePieData}
            formatCurrency={formatCurrency}
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="section-header">
          <h2 className="section-title">Goal Savings</h2>
          <span className="text-ui text-text-muted">Total saved: {formatCurrency(totalGoalSaved)}</span>
        </div>

        {hasGoalSavedData ? (
          <div className="card" style={{ padding: '16px 20px 16px' }}>
            <div className="relative" style={{ height: Math.max(260, goalSavedSeries.length * 46) }}>
              <span className="pointer-events-none absolute left-0 top-0 z-10 text-ui text-text-muted">
                CHF
              </span>

              <ResponsiveBar<GoalSavedPoint>
                data={goalSavedSeries}
                keys={['saved']}
                indexBy="goalLabel"
                layout="horizontal"
                margin={{ top: 16, right: isMobileViewport ? 96 : 132, bottom: 12, left: isMobileViewport ? 104 : 148 }}
                padding={0.28}
                borderRadius={3}
                colors={[ANALYTICS_COLORS.goal]}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 10,
                  format: (value: string | number) => formatYAxisValue(Number(value)),
                }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  format: (value: string | number) => truncateLabel(String(value), goalLabelMaxLength),
                }}
                enableLabel={false}
                valueFormat={(value: string | number) => formatCurrency(Number(value))}
                theme={incomeExpenseTheme}
                enableGridX
                layers={['grid', 'axes', 'bars', GoalSavedValueLabels, 'markers', 'legends', 'annotations']}
                tooltip={(bar: import('@nivo/bar').BarTooltipProps<GoalSavedPoint>) => {
                  const data = bar.data as GoalSavedPoint;
                  return (
                    <div style={barTooltipStyle}>
                      <div className="text-ui text-text mb-1">{data.goalLabel}</div>
                      <div className="text-ui text-goal">Saved: {formatCurrency(data.saved)}</div>
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
            <p className="text-body text-text">No saved amount on goals yet</p>
            <p className="text-ui text-text-muted">Set a goal and link transactions to it to populate this chart.</p>
          </div>
        )}
      </section>

    </div>
  );
}

interface PieCardProps {
  title: string;
  emptyLabel: string;
  data: AnalyticsPieDatum[];
  hasData: boolean;
  formatCurrency: (amount: number) => string;
}

function PieCard({ title, emptyLabel, data, hasData, formatCurrency }: PieCardProps) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const [activeSliceId, setActiveSliceId] = useState<string | number | null>(null);

  useEffect(() => {
    setActiveSliceId(null);
  }, [data]);

  const PieCenterMetricLayer = useMemo(
    () => makePieCenterMetricLayer({ total, activeSliceId }),
    [activeSliceId, total],
  );

  return (
    <div className="card" style={{ padding: '16px 20px 16px' }}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="heading-3 text-text">{title}</h3>
        {hasData && <span className="text-ui text-text-muted">{formatCurrency(total)}</span>}
      </div>

      {hasData ? (
        <div style={{ height: 400 }}>
            <ResponsivePie<AnalyticsPieDatum>
              data={data}
              margin={{ top: 20, right: 72, bottom: 104, left: 72 }}
              innerRadius={0.62}
              padAngle={1.1}
              cornerRadius={3}
              activeOuterRadiusOffset={6}
              colors={(datum) => datum.data.color}
              borderWidth={0}
              enableArcLabels={false}
              enableArcLinkLabels
              arcLinkLabel={(datum) => String(datum.label)}
              arcLinkLabelsSkipAngle={8}
              arcLinkLabelsOffset={6}
              arcLinkLabelsDiagonalLength={18}
              arcLinkLabelsStraightLength={20}
              arcLinkLabelsThickness={1}
              arcLinkLabelsTextOffset={4}
              arcLinkLabelsTextColor={ANALYTICS_COLORS.textSecondary}
              arcLinkLabelsColor={{ from: 'color' }}
              sortByValue
              theme={nivoTheme}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateY: 56,
                  itemWidth: 110,
                  itemHeight: 18,
                  itemsSpacing: 12,
                  itemTextColor: ANALYTICS_COLORS.textSecondary,
                  itemDirection: 'left-to-right',
                  symbolSize: 12,
                  symbolShape: 'circle',
                },
              ]}
              activeId={activeSliceId}
              valueFormat={(value) => formatCurrency(Number(value))}
              tooltip={(item: import('@nivo/pie').PieTooltipProps<AnalyticsPieDatum>) => {
                const share = total > 0 ? (item.datum.value / total) * 100 : 0;
                return (
                  <div style={pieTooltipStyle}>
                      <div className="text-ui text-text mb-1">{item.datum.label}</div>
                      <div className="text-ui text-text-secondary">{formatCurrency(item.datum.value)}</div>
                      <div className="text-ui text-text-muted">{share.toFixed(1)}%</div>
                    </div>
                  );
                }}
                onMouseEnter={(datum) => {
                  setActiveSliceId(datum.id);
                }}
                onMouseLeave={() => {
                  setActiveSliceId(null);
                }}
                layers={['arcLinkLabels', 'arcs', PieCenterMetricLayer, 'legends']}
                animate
                motionConfig="gentle"
              />
        </div>
      ) : (
        <div className="flex items-center justify-center py-14">
          <p className="text-ui text-text-muted">{emptyLabel}</p>
        </div>
      )}
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
