import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, Target } from 'lucide-react';
import { getActiveGoals } from '../../lib/data-service';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';

interface GoalPickerProps {
  currentGoalId?: string;
  onSelect: (goalId: string | null) => void;
  onClose: () => void;
  className?: string;
}

export function GoalPicker({
  currentGoalId,
  onSelect,
  onClose,
  className,
}: GoalPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const goals = useMemo(() => {
    return getActiveGoals().sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredGoals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return goals;
    }

    return goals.filter((goal) => goal.name.toLowerCase().includes(normalizedQuery));
  }, [goals, query]);

  return (
    <div
      className={cn(
        'absolute z-30 w-56 bg-card border border-border rounded-(--radius-md) py-1 shadow-(--shadow-md)',
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative px-2 py-1.5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dimmed" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search goals..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="input pl-7 py-1.5 h-auto"
        />
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'flex items-center gap-2.5 w-full px-3 py-1.5 text-left border-none cursor-pointer text-ui transition-colors',
            !currentGoalId
              ? 'bg-secondary text-foreground'
              : 'bg-transparent text-dimmed hover:bg-secondary hover:text-foreground',
          )}
        >
          <Target size={14} className={cn(!currentGoalId ? 'text-foreground' : 'text-dimmed')} />
          <span className="flex-1 truncate">No goal</span>
          {!currentGoalId && <Check size={12} />}
        </button>

        <div className="h-px bg-border mx-2 my-1" />

        {filteredGoals.length === 0 ? (
          <div className="px-3 py-3 text-ui text-dimmed text-center">
            No goals found
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const isCurrent = goal.id === currentGoalId;
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => onSelect(goal.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-1.5 text-left border-none cursor-pointer text-ui transition-colors',
                  isCurrent
                    ? 'bg-goal/10 text-goal'
                    : 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon name={goal.icon} size={14} className={cn(isCurrent ? 'text-goal' : 'text-dimmed')} />
                <span className="flex-1 truncate">{goal.name}</span>
                {isCurrent && <Check size={12} />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
