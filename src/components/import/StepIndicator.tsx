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
    <div className="flex items-center gap-2">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  'w-8 h-px',
                  isCompleted ? 'bg-text' : 'bg-border',
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-150',
                  isCompleted && 'bg-text text-bg',
                  isCurrent && 'bg-text/15 text-text border border-text/30',
                  !isCompleted && !isCurrent && 'bg-surface text-text-muted border border-border',
                )}
              >
                {isCompleted ? <Check size={12} /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:inline',
                  isCurrent ? 'text-text' : isCompleted ? 'text-text-secondary' : 'text-text-muted',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
