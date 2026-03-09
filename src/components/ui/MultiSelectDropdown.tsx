import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

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
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "select flex items-center gap-2 text-left w-full pr-3",
          hasSelection && "border-primary/40",
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

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] bg-card border border-border rounded-(--radius-md) p-1 z-20 shadow-(--shadow-md)">
          {/* All option */}
          <label
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-(--radius-sm) cursor-pointer transition-colors",
              selectedIds.length === 0
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            <input
              type="checkbox"
              checked={selectedIds.length === 0}
              onChange={() => onChange([])}
              className="cursor-pointer accent-text"
            />
            <span className="text-ui flex-1 truncate">{allLabel}</span>
          </label>

          <div className="h-px bg-border mx-1 my-1" />

          <div className="max-h-64 overflow-y-auto">
            {hasGroups ? (
              groups.map((group) => (
                <div key={group.key}>
                  {group.key && (
                    <div className="px-2 pt-2 pb-1 text-ui text-dimmed font-medium uppercase tracking-wider">
                      {group.key}
                    </div>
                  )}
                  {group.items.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 rounded-(--radius-sm) cursor-pointer transition-colors",
                          isSelected
                            ? "bg-foreground/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(option.id)}
                          className="cursor-pointer accent-text"
                        />
                        <span className="text-ui flex-1 truncate">{option.label}</span>
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
                      "flex items-center gap-2 px-2 py-2 rounded-(--radius-sm) cursor-pointer transition-colors",
                      isSelected
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(option.id)}
                      className="cursor-pointer accent-text"
                    />
                    <span className="text-ui flex-1 truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
