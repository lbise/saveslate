import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ImportStep } from '../../types';

const STEPS: { key: ImportStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'parser', label: 'Parser' },
  { key: 'preview', label: 'Preview' },
  { key: 'complete', label: 'Done' },
];

interface StepIndicatorProps {
  currentStep: ImportStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center flex-nowrap">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center shrink-0">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-ui font-medium tabular-nums leading-none transition-colors duration-150 shrink-0',
                isCompleted && 'bg-foreground text-background',
                isCurrent && 'bg-foreground/15 text-foreground border border-foreground/30',
                !isCompleted && !isCurrent && 'bg-card text-dimmed border border-border',
              )}
            >
              {isCompleted ? <Check size={12} /> : idx + 1}
            </div>
            <span
              className={cn(
                'ml-2 text-ui font-medium hidden sm:inline-flex sm:items-center leading-none',
                isCurrent ? 'text-foreground' : isCompleted ? 'text-muted-foreground' : 'text-dimmed',
              )}
            >
              {step.label}
            </span>
            {!isLast && (
              <div
                className={cn(
                  'mx-2 w-8 border-t shrink-0 self-center',
                  idx < currentIdx ? 'border-foreground' : 'border-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
