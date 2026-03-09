import { Check } from 'lucide-react';
import { Icon } from './Icon';
import { cn } from '../../lib/utils';
import { CATEGORIES, CATEGORY_GROUPS } from '../../lib/data-service';
import { Popover, PopoverAnchor, PopoverContent } from './popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';

interface CategoryPickerProps {
  currentCategoryId: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  openUpward?: boolean;
}

export function CategoryPicker({
  currentCategoryId,
  onSelect,
  onClose,
  openUpward = false,
}: CategoryPickerProps) {
  const knownGroupIds = new Set(CATEGORY_GROUPS.map((group) => group.id));

  const sortedGroups = [...CATEGORY_GROUPS].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );

  const ungroupedCategories = CATEGORIES
    .filter((category) => !category.groupId || !knownGroupIds.has(category.groupId))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    onClose();
  };

  return (
    <Popover open onOpenChange={(open) => { if (!open) onClose(); }}>
      <PopoverAnchor asChild>
        <span className="absolute left-0 top-0 size-0" />
      </PopoverAnchor>
      <PopoverContent
        side={openUpward ? 'top' : 'bottom'}
        align="start"
        className="w-52 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command filter={(value, search) => {
          const cat = CATEGORIES.find((c) => c.id === value);
          if (!cat) return 0;
          return cat.name.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
        }}>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty className="py-3 text-sm text-dimmed">
              No categories found
            </CommandEmpty>
            {sortedGroups.map((group) => {
              const categories = CATEGORIES
                .filter((category) => category.groupId === group.id)
                .sort((a, b) => a.name.localeCompare(b.name));

              if (categories.length === 0) return null;

              return (
                <CommandGroup key={group.id} heading={group.name}>
                  {categories.map((cat) => {
                    const isCurrent = cat.id === currentCategoryId;
                    return (
                      <CommandItem
                        key={cat.id}
                        value={cat.id}
                        onSelect={handleSelect}
                        className={cn(
                          isCurrent && 'bg-foreground/10 text-foreground',
                        )}
                      >
                        <Icon
                          name={cat.icon}
                          size={14}
                          className={cn(
                            'text-muted-foreground',
                            isCurrent ? 'opacity-100' : 'opacity-60',
                          )}
                        />
                        <span className="flex-1 truncate">{cat.name}</span>
                        {isCurrent && <Check size={12} />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
            {ungroupedCategories.length > 0 && (
              <CommandGroup heading="Ungrouped">
                {ungroupedCategories.map((cat) => {
                  const isCurrent = cat.id === currentCategoryId;
                  return (
                    <CommandItem
                      key={cat.id}
                      value={cat.id}
                      onSelect={handleSelect}
                      className={cn(
                        isCurrent && 'bg-foreground/10 text-foreground',
                      )}
                    >
                      <Icon
                        name={cat.icon}
                        size={14}
                        className={cn(
                          'text-muted-foreground',
                          isCurrent ? 'opacity-100' : 'opacity-60',
                        )}
                      />
                      <span className="flex-1 truncate">{cat.name}</span>
                      {isCurrent && <Check size={12} />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
