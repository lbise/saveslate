import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { cn } from '../../lib/utils';

export type EntityCardTone =
  | 'neutral'
  | 'accent'
  | 'goal'
  | 'income'
  | 'transfer'
  | 'warning'
  | 'expense';

export type EntityCardDetailTone =
  | 'default'
  | 'strong'
  | 'muted'
  | 'accent'
  | 'goal'
  | 'income'
  | 'transfer'
  | 'warning'
  | 'expense';

export interface EntityCardDetailItem {
  label: string;
  value: string;
  tone?: EntityCardDetailTone;
}

interface EntityCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  tone?: EntityCardTone;
  metric?: ReactNode;
  metricClassName?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

interface EntityCardActionButtonProps {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'danger';
  onClick?: () => void;
  className?: string;
}

interface EntityCardDetailListProps {
  items: EntityCardDetailItem[];
  layout?: 'compact' | 'split';
  className?: string;
}

interface EntityCardSectionProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const iconToneClasses: Record<EntityCardTone, string> = {
  neutral: 'bg-text/10 text-text-secondary',
  accent: 'bg-accent/16 text-accent',
  goal: 'bg-goal/16 text-goal',
  income: 'bg-income/16 text-income',
  transfer: 'bg-transfer/16 text-transfer',
  warning: 'bg-warning/16 text-warning',
  expense: 'bg-expense/16 text-expense',
};

const detailToneClasses: Record<EntityCardDetailTone, string> = {
  default: 'text-text-secondary',
  strong: 'text-text font-medium',
  muted: 'text-text-muted',
  accent: 'text-accent font-medium',
  goal: 'text-goal font-medium',
  income: 'text-income font-medium',
  transfer: 'text-transfer font-medium',
  warning: 'text-warning font-medium',
  expense: 'text-expense font-medium',
};

const actionToneClasses = {
  default: 'text-text-muted hover:text-text',
  danger: 'text-text-muted hover:text-expense',
};

export function EntityCard({
  icon,
  title,
  subtitle,
  tone = 'neutral',
  metric,
  metricClassName,
  badges,
  actions,
  children,
  className,
}: EntityCardProps) {
  return (
    <article className={cn('card p-4 sm:p-5 transition-colors duration-150 hover:bg-surface-hover/35', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-(--radius-md) flex items-center justify-center shrink-0',
              iconToneClasses[tone],
            )}
          >
            <Icon name={icon} size={16} />
          </div>

          <div className="min-w-0">
            <h3 className="heading-3 text-text truncate">{title}</h3>
            {subtitle && <p className="text-ui text-text-muted mt-0.5">{subtitle}</p>}
            {badges && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
          </div>
        </div>

        {(metric || actions) && (
          <div className="shrink-0 flex items-start gap-1.5">
            {metric && (
              <div
                className={cn('text-body font-medium text-text text-right', metricClassName)}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {metric}
              </div>
            )}
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="mt-3 pt-3 border-t border-border">
          {children}
        </div>
      )}
    </article>
  );
}

export function EntityCardActionButton({
  icon: ActionIcon,
  label,
  tone = 'default',
  onClick,
  className,
}: EntityCardActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer transition-colors',
        actionToneClasses[tone],
        className,
      )}
      aria-label={label}
      title={label}
    >
      <ActionIcon size={14} />
    </button>
  );
}

export function EntityCardDetailList({ items, layout = 'compact', className }: EntityCardDetailListProps) {

  if (layout === 'split') {
    return (
      <div className={cn('space-y-1.5', className)}>
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="flex items-center justify-between gap-3">
            <span className="text-ui text-text-muted">{item.label}</span>
            <span className={cn('text-ui text-right', detailToneClasses[item.tone ?? 'default'])}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5',
        className,
      )}
    >
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="contents">
          <span className="text-ui text-text-muted whitespace-nowrap">{item.label}</span>
          <span className={cn('text-ui min-w-0', detailToneClasses[item.tone ?? 'default'])}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function EntityCardSection({ title, action, children, className }: EntityCardSectionProps) {
  return (
    <div className={cn('mt-3 pt-3 border-t border-border', className)}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {title ? <span className="text-ui text-text-muted uppercase tracking-wider">{title}</span> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
