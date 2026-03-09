import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { ReactNode } from "react";

export interface MultiSelectOption {
  id: string;
  label: string;
  group?: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allLabel: string;
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  allLabel,
  placeholder,
  icon,
  className,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  let displayLabel = allLabel;
  if (selectedIds.length === 1) {
    displayLabel = options.find((o) => o.id === selectedIds[0])?.label ?? "1 selected";
  } else if (selectedIds.length > 1) {
    displayLabel = `${selectedIds.length} selected`;
  }

  // Group options if any have a group property
  const hasGroups = options.some((o) => o.group);
  const groups: { key: string; items: MultiSelectOption[] }[] = [];
  if (hasGroups) {
    const map = new Map<string, MultiSelectOption[]>();
    for (const opt of options) {
      const key = opt.group ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(opt);
    }
    for (const [key, items] of map) {
      groups.push({ key, items });
    }
  }

  const hasSelection = selectedIds.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-left text-sm text-foreground transition-colors cursor-pointer",
            hasSelection && "border-primary/40",
            className,
          )}
        >
          {icon && <span className={cn("shrink-0", hasSelection ? "text-primary" : "text-dimmed")}>{icon}</span>}
          <span className="flex-1 truncate">{placeholder && selectedIds.length === 0 ? placeholder : displayLabel}</span>
          <ChevronDown
            size={14}
            className={cn(
              "shrink-0 transition-transform duration-150",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-1"
      >
        {/* All option */}
        <label
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer transition-colors",
            selectedIds.length === 0
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          )}
        >
          <Checkbox
            checked={selectedIds.length === 0}
            onCheckedChange={() => onChange([])}
          />
          <span className="text-sm text-muted-foreground flex-1 truncate">{allLabel}</span>
        </label>

        <Separator className="mx-1 my-1 w-auto" />

        <div className="max-h-64 overflow-y-auto">
          {hasGroups ? (
            groups.map((group) => (
              <div key={group.key}>
                {group.key && (
                  <div className="px-2 pt-2 pb-1 text-sm text-dimmed font-medium uppercase tracking-wider">
                    {group.key}
                  </div>
                )}
                {group.items.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer transition-colors",
                        isSelected
                          ? "bg-foreground/10 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(option.id)}
                      />
                      <span className="text-sm text-muted-foreground flex-1 truncate">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            ))
          ) : (
            options.map((option) => {
              const isSelected = selectedIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer transition-colors",
                    isSelected
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(option.id)}
                  />
                  <span className="text-sm text-muted-foreground flex-1 truncate">{option.label}</span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
