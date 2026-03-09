import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { Badge, Icon } from '../components/ui';
import { cn } from '../lib/utils';

/* ─── Types ─────────────────────────────────────────────────────── */

type CardTone =
  | 'neutral'
  | 'accent'
  | 'goal'
  | 'income'
  | 'transfer'
  | 'warning'
  | 'expense';

interface StatChip {
  label: string;
  value: string;
  tone?: CardTone;
}

interface MockCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  tone: CardTone;
  metric: string;
  metricLabel?: string;
  badges?: { label: string; variant?: 'default' | 'income' | 'expense' | 'transfer' | 'split' | 'muted' }[];
  stats: StatChip[];
  progress?: number;
  locked?: boolean;
}

interface MockSection {
  id: string;
  title: string;
  count: number;
  cards: MockCard[];
}

/* ─── Tone maps ─────────────────────────────────────────────────── */

const headerTintClasses: Record<CardTone, string> = {
  neutral: 'bg-foreground/[0.03]',
  accent: 'bg-primary/[0.06]',
  goal: 'bg-goal/[0.06]',
  income: 'bg-income/[0.06]',
  transfer: 'bg-transfer/[0.06]',
  warning: 'bg-warning/[0.06]',
  expense: 'bg-expense/[0.06]',
};

const iconToneClasses: Record<CardTone, string> = {
  neutral: 'bg-foreground/10 text-muted-foreground',
  accent: 'bg-primary/16 text-primary',
  goal: 'bg-goal/16 text-goal',
  income: 'bg-income/16 text-income',
  transfer: 'bg-transfer/16 text-transfer',
  warning: 'bg-warning/16 text-warning',
  expense: 'bg-expense/16 text-expense',
};

const metricColorClasses: Record<CardTone, string> = {
  neutral: 'text-foreground',
  accent: 'text-primary',
  goal: 'text-goal',
  income: 'text-income',
  transfer: 'text-transfer',
  warning: 'text-warning',
  expense: 'text-expense',
};

const progressBarClasses: Record<CardTone, string> = {
  neutral: 'bg-muted-foreground',
  accent: 'bg-primary',
  goal: 'bg-goal',
  income: 'bg-income',
  transfer: 'bg-transfer',
  warning: 'bg-warning',
  expense: 'bg-expense',
};

const chipToneClasses: Record<CardTone, string> = {
  neutral: 'text-muted-foreground',
  accent: 'text-primary',
  goal: 'text-goal',
  income: 'text-income',
  transfer: 'text-transfer',
  warning: 'text-warning',
  expense: 'text-expense',
};

/* ─── Dummy data ────────────────────────────────────────────────── */

const MOCK_SECTIONS: MockSection[] = [
  {
    id: 'accounts',
    title: 'Accounts',
    count: 3,
    cards: [
      {
        id: 'acc-checking',
        icon: 'Wallet',
        title: 'Main Checking',
        subtitle: 'Checking · CHF',
        tone: 'accent',
        metric: 'CHF 8,420.20',
        badges: [
          { label: 'Primary', variant: 'default' },
          { label: 'Synced', variant: 'income' },
        ],
        stats: [
          { label: '30-day activity', value: '22 tx', tone: 'accent' },
          { label: 'Latest', value: 'Salary deposit yesterday' },
          { label: 'IBAN', value: 'CH93 0076 2011 ····' },
        ],
      },
      {
        id: 'acc-savings',
        icon: 'PiggyBank',
        title: 'Travel Buffer',
        subtitle: 'Savings · EUR',
        tone: 'warning',
        metric: 'EUR 1,140.00',
        badges: [{ label: 'Savings', variant: 'muted' }],
        stats: [
          { label: 'Activity', value: '4 tx this month' },
          { label: 'Latest', value: 'Hotel booking transfer' },
          { label: 'Note', value: 'Review monthly top-up' },
        ],
      },
      {
        id: 'acc-credit',
        icon: 'CreditCard',
        title: 'Visa Platinum',
        subtitle: 'Credit · CHF',
        tone: 'expense',
        metric: 'CHF -1,230.50',
        badges: [{ label: 'Credit', variant: 'expense' }],
        stats: [
          { label: 'Statement', value: 'Due Mar 15', tone: 'expense' },
          { label: 'Limit', value: 'CHF 10,000' },
          { label: 'Utilization', value: '12.3%' },
        ],
      },
    ],
  },
  {
    id: 'categories',
    title: 'Categories',
    count: 3,
    cards: [
      {
        id: 'cat-groceries',
        icon: 'ShoppingCart',
        title: 'Groceries',
        subtitle: 'Living group',
        tone: 'accent',
        metric: '14 transactions',
        metricLabel: 'this month',
        badges: [
          { label: 'Default', variant: 'muted' },
          { label: 'High use', variant: 'default' },
        ],
        stats: [
          { label: 'Avg. spend', value: 'CHF 420/mo', tone: 'accent' },
          { label: 'Last used', value: 'Today' },
          { label: 'Rules linked', value: '3 active' },
        ],
      },
      {
        id: 'cat-transfer',
        icon: 'ArrowLeftRight',
        title: 'Transfer',
        subtitle: 'System category',
        tone: 'transfer',
        metric: '5 transactions',
        metricLabel: 'this month',
        badges: [{ label: 'System', variant: 'transfer' }],
        locked: true,
        stats: [
          { label: 'Purpose', value: 'Internal movement' },
          { label: 'Access', value: 'Locked', tone: 'transfer' },
          { label: 'Fallback', value: 'Always available' },
        ],
      },
      {
        id: 'cat-dining',
        icon: 'Utensils',
        title: 'Dining Out',
        subtitle: 'Lifestyle group',
        tone: 'goal',
        metric: '8 transactions',
        metricLabel: 'this month',
        badges: [{ label: 'Custom', variant: 'muted' }],
        stats: [
          { label: 'Avg. spend', value: 'CHF 180/mo' },
          { label: 'Trend', value: '+12% vs last month', tone: 'warning' },
          { label: 'Last used', value: '2 days ago' },
        ],
      },
    ],
  },
  {
    id: 'goals',
    title: 'Goals',
    count: 3,
    cards: [
      {
        id: 'goal-emergency',
        icon: 'ShieldCheck',
        title: 'Emergency Fund',
        subtitle: 'Safety goal · due Dec 2026',
        tone: 'goal',
        metric: '62%',
        metricLabel: 'CHF 4,030 of 6,500',
        badges: [
          { label: 'On track', variant: 'income' },
          { label: 'Monthly plan', variant: 'muted' },
        ],
        progress: 62,
        stats: [
          { label: 'Saved', value: 'CHF 4,030', tone: 'goal' },
          { label: 'Remaining', value: 'CHF 2,470' },
          { label: 'Contribution', value: 'CHF 230/mo' },
        ],
      },
      {
        id: 'goal-trip',
        icon: 'Mountain',
        title: 'Winter Trip',
        subtitle: 'Open-ended goal',
        tone: 'accent',
        metric: 'Open',
        metricLabel: 'CHF 1,260 saved',
        badges: [{ label: 'Flexible', variant: 'muted' }],
        stats: [
          { label: 'Saved', value: 'CHF 1,260', tone: 'accent' },
          { label: 'Recent', value: 'CHF 120 this week', tone: 'income' },
          { label: 'Timeline', value: 'No deadline' },
        ],
      },
      {
        id: 'goal-laptop',
        icon: 'Laptop',
        title: 'New Laptop',
        subtitle: 'Target goal · due Jun 2026',
        tone: 'income',
        metric: '100%',
        metricLabel: 'CHF 2,400 of 2,400',
        badges: [{ label: 'Completed', variant: 'income' }],
        progress: 100,
        stats: [
          { label: 'Saved', value: 'CHF 2,400', tone: 'income' },
          { label: 'Completed', value: 'Feb 2026' },
          { label: 'Duration', value: '8 months' },
        ],
      },
    ],
  },
  {
    id: 'rules',
    title: 'Rules',
    count: 2,
    cards: [
      {
        id: 'rule-coop',
        icon: 'Bot',
        title: 'Auto-tag Coop Receipts',
        subtitle: 'On import · any condition',
        tone: 'income',
        metric: 'Enabled',
        badges: [
          { label: 'Import trigger', variant: 'muted' },
          { label: 'Set category', variant: 'income' },
        ],
        stats: [
          { label: 'Matched', value: '18 tx this month', tone: 'income' },
          { label: 'Last run', value: 'Today 09:14' },
          { label: 'Condition', value: 'Description contains "coop"' },
        ],
      },
      {
        id: 'rule-large',
        icon: 'AlertTriangle',
        title: 'Review Large Transfers',
        subtitle: 'Manual run · all conditions',
        tone: 'warning',
        metric: 'Disabled',
        badges: [{ label: 'Manual trigger', variant: 'muted' }],
        stats: [
          { label: 'Potential', value: '6 matches', tone: 'warning' },
          { label: 'Last run', value: '3 days ago' },
          { label: 'Condition', value: 'Amount > 500 & Transfer' },
        ],
      },
    ],
  },
];

/* ─── Overflow Menu ─────────────────────────────────────────────── */

interface OverflowMenuProps {
  locked?: boolean;
}

function OverflowMenu({ locked }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-(--radius-sm)',
          'text-dimmed hover:text-foreground hover:bg-secondary',
          'transition-colors duration-150',
        )}
        aria-label="Actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-(--radius-md) border border-border bg-card py-1 shadow-(--shadow-md)">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left bg-transparent border-none text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150"
          >
            <Pencil size={13} />
            <span className="text-ui">Edit</span>
          </button>
          {!locked && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left bg-transparent border-none text-dimmed hover:text-expense hover:bg-expense/8 transition-colors duration-150"
            >
              <Trash2 size={13} />
              <span className="text-ui">Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── LayeredCard ────────────────────────────────────────────────── */

interface LayeredCardProps {
  card: MockCard;
}

function LayeredCard({ card }: LayeredCardProps) {
  const hasProgress = card.progress !== undefined;

  return (
    <article className="rounded-(--radius-lg) border border-border overflow-hidden bg-card transition-colors duration-150 hover:border-dimmed/30">
      {/* ── Header zone ──────────────────────────────── */}
      <div className={cn('px-5 pt-4 pb-3.5', headerTintClasses[card.tone])}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'w-9 h-9 rounded-(--radius-md) flex items-center justify-center shrink-0',
                iconToneClasses[card.tone],
              )}
            >
              <Icon name={card.icon} size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="heading-3 text-foreground truncate">{card.title}</h3>
              <p className="text-ui text-dimmed mt-0.5">{card.subtitle}</p>
              {card.badges && card.badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.badges.map((badge) => (
                    <Badge key={badge.label} variant={badge.variant ?? 'muted'}>
                      {badge.label}
                    </Badge>
                  ))}
                  {card.locked && <Badge variant="muted">Locked</Badge>}
                </div>
              )}
            </div>
          </div>

          <OverflowMenu locked={card.locked} />
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── Body zone ────────────────────────────────── */}
      <div className="px-5 pt-4 pb-5">
        {/* Primary metric */}
        <div className="mb-4">
          <div
            className={cn('font-medium', metricColorClasses[card.tone])}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {card.metric}
          </div>
          {card.metricLabel && (
            <p className="text-ui text-dimmed mt-1">{card.metricLabel}</p>
          )}
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2">
          {card.stats.map((stat) => (
            <div
              key={stat.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-(--radius-full) bg-background border border-border-subtle"
            >
              <span className="text-ui text-dimmed">{stat.label}</span>
              <span className={cn('text-ui font-medium', stat.tone ? chipToneClasses[stat.tone] : 'text-muted-foreground')}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Progress bar (bottom edge) ───────────────── */}
      {hasProgress && (
        <div className="h-1 bg-border">
          <div
            className={cn('h-full transition-[width] duration-500 ease-out', progressBarClasses[card.tone])}
            style={{ width: `${card.progress}%` }}
          />
        </div>
      )}
    </article>
  );
}

/* ─── Section ───────────────────────────────────────────────────── */

interface MockSectionBlockProps {
  section: MockSection;
}

function MockSectionBlock({ section }: MockSectionBlockProps) {
  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">{section.title}</h2>
        <span className="text-ui text-dimmed">{section.count} items</span>
      </div>
      <div className="flex flex-col gap-5">
        {section.cards.map((card) => (
          <LayeredCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export function TestMockup2() {
  return (
    <div className="page-container">
      <PageHeader title="Card Design v2" />

      <p className="text-body text-dimmed">
        Layered panel design: tinted header zone, prominent metric, horizontal stat chips, edge progress bar.
      </p>

      {MOCK_SECTIONS.map((section) => (
        <MockSectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}
