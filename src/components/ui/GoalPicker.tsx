import { useMemo } from 'react';
import { Check, Target } from 'lucide-react';
import { getActiveGoals } from '../../lib/data-service';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import { Popover, PopoverAnchor, PopoverContent } from './popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './command';

interface GoalPickerProps {
  currentGoalId?: string;
  onSelect: (goalId: string | null) => void;
  onClose: () => void;
}

export function GoalPicker({
  currentGoalId,
  onSelect,
  onClose,
}: GoalPickerProps) {
  const goals = useMemo(() => {
    return getActiveGoals().sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const handleSelect = (goalId: string) => {
    onSelect(goalId === '__none__' ? null : goalId);
    onClose();
  };

  return (
    <Popover open onOpenChange={(open) => { if (!open) onClose(); }}>
      <PopoverAnchor asChild>
        <span className="absolute left-0 top-0 size-0" />
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-56 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command filter={(value, search) => {
          if (value === '__none__') {
            return 'no goal'.includes(search.toLowerCase()) ? 1 : 0;
          }
          const goal = goals.find((g) => g.id === value);
          if (!goal) return 0;
          return goal.name.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
        }}>
          <CommandInput placeholder="Search goals..." />
          <CommandList>
            <CommandEmpty className="py-3 text-sm text-dimmed">
              No goals found
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={handleSelect}
                className={cn(!currentGoalId && 'bg-secondary text-foreground')}
              >
                <Target
                  size={14}
                  className={cn(!currentGoalId ? 'text-foreground' : 'text-dimmed')}
                />
                <span className="flex-1 truncate">No goal</span>
                {!currentGoalId && <Check size={12} />}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {goals.map((goal) => {
                const isCurrent = goal.id === currentGoalId;
                return (
                  <CommandItem
                    key={goal.id}
                    value={goal.id}
                    onSelect={handleSelect}
                    className={cn(
                      isCurrent && 'bg-goal/10 text-goal',
                    )}
                  >
                    <Icon
                      name={goal.icon}
                      size={14}
                      className={cn(isCurrent ? 'text-goal' : 'text-dimmed')}
                    />
                    <span className="flex-1 truncate">{goal.name}</span>
                    {isCurrent && <Check size={12} />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
