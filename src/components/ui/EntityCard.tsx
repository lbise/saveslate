import { type ReactNode } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { Card } from './Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
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

interface EntityCardMenuAction {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  icon?: LucideIcon;
}

interface EntityCardOverflowMenuProps {
  label?: string;
  actions: EntityCardMenuAction[];
}

const iconToneClasses: Record<EntityCardTone, string> = {
  neutral: 'bg-foreground/10 text-muted-foreground',
  accent: 'bg-primary/16 text-primary',
  goal: 'bg-goal/16 text-goal',
  income: 'bg-income/16 text-income',
  transfer: 'bg-transfer/16 text-transfer',
  warning: 'bg-warning/16 text-warning',
  expense: 'bg-expense/16 text-expense',
};

const detailToneClasses: Record<EntityCardDetailTone, string> = {
  default: 'text-muted-foreground',
  strong: 'text-foreground font-medium',
  muted: 'text-dimmed',
  accent: 'text-primary font-medium',
  goal: 'text-goal font-medium',
  income: 'text-income font-medium',
  transfer: 'text-transfer font-medium',
  warning: 'text-warning font-medium',
  expense: 'text-expense font-medium',
};

const actionButtonToneClasses = {
  default: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  danger: 'text-expense hover:bg-expense/8 hover:text-expense',
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
    <Card className={cn('p-4 sm:p-5 transition-colors duration-150 hover:bg-secondary/35', className)}>
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
            <h3 className="font-display text-base font-medium text-foreground truncate">{title}</h3>
            {subtitle && <p className="text-sm text-dimmed mt-0.5">{subtitle}</p>}
            {badges && <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div>}
          </div>
        </div>

        {(metric || actions) && (
          <div className="shrink-0 flex items-start gap-1.5">
            {metric && (
              <div
                className={cn('text-base font-medium text-foreground text-right', metricClassName)}
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
    </Card>
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
        actionButtonToneClasses[tone],        className,
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
            <span className="text-sm text-dimmed">{item.label}</span>
            <span className={cn('text-sm text-muted-foreground text-right', detailToneClasses[item.tone ?? 'default'])}>
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
          <span className="text-sm text-dimmed whitespace-nowrap">{item.label}</span>
          <span className={cn('text-sm text-muted-foreground min-w-0', detailToneClasses[item.tone ?? 'default'])}>
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
          {title ? <span className="text-sm text-dimmed uppercase tracking-wider">{title}</span> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EntityCardOverflowMenu({ label = 'More actions', actions }: EntityCardOverflowMenuProps) {
  const firstDangerActionIndex = actions.findIndex((action) => action.tone === 'danger');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-dimmed hover:text-foreground transition-colors"
          aria-label={label}
          title={label}
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[144px]">
        {actions.map((action, index) => {
          const ActionIcon = action.icon;
          const showDivider = firstDangerActionIndex > 0 && firstDangerActionIndex === index;

          return (
            <div key={`${action.label}-${index}`}>
              {showDivider && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={action.disabled}
                variant={action.tone === 'danger' ? 'destructive' : 'default'}
                onClick={action.onClick}
              >
                {ActionIcon && <ActionIcon size={12} />}
                {action.label}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
