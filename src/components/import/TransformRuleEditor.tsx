import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  X,
  CircleHelp,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ParsedRow,
  FieldTransform,
  TransformableField,
} from "../../types";

const TRANSFORMABLE_FIELDS: { value: TransformableField; label: string }[] = [
  { value: "description", label: "Description" },
  { value: "category", label: "Category" },
  { value: "currency", label: "Currency" },
];

export interface TransformRuleEditorProps {
  transform: FieldTransform;
  index: number;
  total: number;
  preTransformRows: ParsedRow[];
  onChange: (update: Partial<FieldTransform>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

export function TransformRuleEditor({
  transform,
  index,
  total,
  preTransformRows,
  onChange,
  onRemove,
  onMove,
}: TransformRuleEditorProps) {
  const [showMatches, setShowMatches] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  // Compute match details from parsed field values (shows actual transaction data)
  const matchDetails = useMemo(() => {
    type MatchItem = {
      source: string;
      output?: string;
      highlights: { start: number; end: number; groupName: string }[];
    };
    if (!transform.matchPattern) {
      return {
        matched: 0,
        total: preTransformRows.length,
        valid: true,
        items: [] as MatchItem[],
      };
    }

    const values = preTransformRows.map((row) => {
      const val = row[transform.sourceField];
      return typeof val === "string" ? val : "";
    });

    try {
      const re = new RegExp(transform.matchPattern, "i");
      const items: MatchItem[] = [];

      let extractRe: RegExp | null = null;
      if (transform.extractPattern) {
        try {
          extractRe = new RegExp(transform.extractPattern, "d");
        } catch {
          /* invalid */
        }
      }

      for (const value of values) {
        if (re.test(value)) {
          let output: string | undefined;
          let highlights: { start: number; end: number; groupName: string }[] =
            [];

          if (extractRe) {
            const m = value.match(extractRe);
            if (m?.groups && Object.keys(m.groups).length > 0) {
              // Use explicit replacement template, or auto-join all named groups
              if (transform.replacement) {
                output = transform.replacement.replace(
                  /\{\{(\w+)\}\}/g,
                  (_, name) => m.groups?.[name] ?? "",
                );
              } else {
                output = Object.values(m.groups).filter(Boolean).join(" ");
              }
              // Extract highlight positions from named capture groups
              const indices = (
                m as RegExpExecArray & {
                  indices?: { groups?: Record<string, [number, number]> };
                }
              ).indices;
              if (indices?.groups) {
                highlights = Object.entries(indices.groups)
                  .filter(
                    (entry): entry is [string, [number, number]] =>
                      entry[1] != null,
                  )
                  .map(([groupName, [start, end]]) => ({
                    start,
                    end,
                    groupName,
                  }))
                  .sort((a, b) => a.start - b.start);
                // Remove overlaps: skip any span that starts before the previous one ends
                const deduped: typeof highlights = [];
                for (const h of highlights) {
                  if (
                    deduped.length === 0 ||
                    h.start >= deduped[deduped.length - 1].end
                  ) {
                    deduped.push(h);
                  }
                }
                highlights = deduped;
              }
            }
          } else {
            // No extract pattern — highlight the full match span
            const matchExec = re.exec(value);
            if (matchExec) {
              highlights = [
                {
                  start: matchExec.index,
                  end: matchExec.index + matchExec[0].length,
                  groupName: "match",
                },
              ];
            }
          }

          items.push({ source: value, output, highlights });
        }
      }

      return {
        matched: items.length,
        total: values.length,
        valid: true,
        items,
      };
    } catch {
      return {
        matched: 0,
        total: values.length,
        valid: false,
        items: [] as {
          source: string;
          output?: string;
          highlights: { start: number; end: number; groupName: string }[];
        }[],
      };
    }
  }, [
    transform.sourceField,
    transform.matchPattern,
    transform.extractPattern,
    transform.replacement,
    preTransformRows,
  ]);

  // Validate extract regex
  const extractValid = useMemo(() => {
    if (!transform.extractPattern) return true;
    try {
      new RegExp(transform.extractPattern);
      return true;
    } catch {
      return false;
    }
  }, [transform.extractPattern]);

  return (
    <div className="p-3 rounded-(--radius-md) border border-border bg-card space-y-2.5">
      {/* Header row: label + actions */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={transform.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={`Rule ${index + 1}`}
          className="text-sm flex-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          {total > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove("up")}
                disabled={index === 0}
                className="size-7 disabled:opacity-30" aria-label="Move rule up"
              >
                <ChevronUp size={12} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove("down")}
                disabled={index === total - 1}
                className="size-7 disabled:opacity-30" aria-label="Move rule down"
              >
                <ChevronDown size={12} />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="size-7 text-dimmed hover:text-expense" aria-label="Remove transform rule"
          >
            <X size={12} />
          </Button>
        </div>
      </div>

      {/* Source → Target */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-dimmed w-14 shrink-0">Source</label>
        <Select
          value={transform.sourceField}
          onValueChange={(value) =>
            onChange({ sourceField: value as TransformableField })
          }
        >
          <SelectTrigger className="text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSFORMABLE_FIELDS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-dimmed">&rarr;</span>
        <label className="text-sm text-dimmed w-14 shrink-0">Target</label>
        <Select
          value={transform.targetField}
          onValueChange={(value) =>
            onChange({ targetField: value as TransformableField })
          }
        >
          <SelectTrigger className="text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSFORMABLE_FIELDS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Match pattern */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-dimmed w-14 shrink-0 inline-flex items-center gap-1">
          Match
          <FieldHelpTooltip text="Regex that decides which rows this rule applies to." />
          {!transform.matchPattern && (
            <span className="text-expense ml-0.5">*</span>
          )}
        </label>
        <Input
          type="text"
          value={transform.matchPattern}
          onChange={(e) => onChange({ matchPattern: e.target.value })}
          placeholder="Regex to test (e.g. ^TWINT)"
          className={cn(
            "text-sm font-mono flex-1",
            !matchDetails.valid && "border-expense",
          )}
        />
        {transform.matchPattern && (
          <>
            <span
              className={cn(
                "text-sm text-muted-foreground shrink-0 tabular-nums whitespace-nowrap",
                !matchDetails.valid
                  ? "text-expense"
                  : matchDetails.matched > 0
                    ? "text-income"
                    : "text-dimmed",
              )}
            >
              {!matchDetails.valid
                ? "invalid"
                : `${matchDetails.matched}/${matchDetails.total}`}
            </span>
            {matchDetails.valid && matchDetails.matched > 0 && (
              <button
                type="button"
                onClick={() => setShowMatches(!showMatches)}
                className="text-sm text-dimmed hover:text-foreground transition-colors shrink-0 bg-transparent border-none cursor-pointer"
              >
                {showMatches ? "Hide" : "Show"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Extract pattern */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-dimmed w-14 shrink-0 inline-flex items-center gap-1">
          Extract
          <FieldHelpTooltip text="Use named capture groups, for example (?<merchant>...), to pick values from the source." />
          {!transform.extractPattern && (
            <span className="text-expense ml-0.5">*</span>
          )}
        </label>
        <Input
          type="text"
          value={transform.extractPattern}
          onChange={(e) => onChange({ extractPattern: e.target.value })}
          placeholder="Regex with named groups: (?<merchant>.+)"
          className={cn(
            "text-sm font-mono flex-1",
            !extractValid && "border-expense",
          )}
        />
        {!extractValid && (
          <span className="text-sm text-expense shrink-0">invalid</span>
        )}
      </div>

      {/* Replacement template */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-dimmed w-14 shrink-0 inline-flex items-center gap-1">
          Output
          <FieldHelpTooltip text="Use templates like {{merchant}}. Leave empty to auto-join all named groups." />
        </label>
        <Input
          type="text"
          value={transform.replacement}
          onChange={(e) => onChange({ replacement: e.target.value })}
          placeholder="Template: {{merchant}}"
          className="text-sm font-mono flex-1"
        />
      </div>

      {/* Matched rows preview */}
      {showMatches && matchDetails.items.length > 0 && (
        <div className="rounded-(--radius-sm) border border-border overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {matchDetails.items
              .slice(0, showAllMatches ? undefined : 5)
              .map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-2.5 py-1.5 text-sm border-b border-border last:border-b-0 bg-background/50"
                >
                  <span className="text-muted-foreground break-words min-w-0 flex-1 font-mono">
                    <HighlightedSource
                      source={item.source}
                      highlights={item.highlights}
                    />
                  </span>
                  {item.output !== undefined && (
                    <>
                      <span className="text-dimmed shrink-0 mt-0.5">
                        &rarr;
                      </span>
                      <span className="text-income break-words min-w-0 flex-1 font-mono">
                        {item.output}
                      </span>
                    </>
                  )}
                </div>
              ))}
          </div>
          {matchDetails.items.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllMatches(!showAllMatches)}
              className="w-full px-2.5 py-1.5 text-sm text-dimmed hover:text-foreground bg-card border-t border-border transition-colors cursor-pointer border-x-0 border-b-0"
            >
              {showAllMatches
                ? "Show less"
                : `Show all ${matchDetails.items.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper components ───────────────────────────────────────

interface HighlightedSourceProps {
  source: string;
  highlights: { start: number; end: number; groupName: string }[];
}

function HighlightedSource({ source, highlights }: HighlightedSourceProps) {
  if (highlights.length === 0) {
    return <>{source}</>;
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (const { start, end, groupName } of highlights) {
    if (start > cursor) {
      segments.push(source.slice(cursor, start));
    }
    segments.push(
      <span
        key={`${start}-${end}`}
        className="bg-primary/15 rounded-sm px-px"
        title={groupName}
      >
        {source.slice(start, end)}
      </span>,
    );
    cursor = end;
  }

  if (cursor < source.length) {
    segments.push(source.slice(cursor));
  }

  return <>{segments}</>;
}

interface FieldHelpTooltipProps {
  text: string;
}

function FieldHelpTooltip({ text }: FieldHelpTooltipProps) {
  return (
    <span
      className="inline-flex items-center text-dimmed hover:text-foreground cursor-help"
      title={text}
      aria-label={text}
    >
      <CircleHelp size={12} />
    </span>
  );
}
