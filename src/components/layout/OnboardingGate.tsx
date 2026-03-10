import { CircleHelp, Layers3, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useOnboarding, useSettings } from '../../hooks';
import { getCurrencyOptionsWithFallback } from '../../lib/currencies';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui';

import type { CategoryPreset } from '../../types';

const CATEGORY_PRESET_OPTIONS: Array<{
  id: CategoryPreset;
  title: string;
  description: string;
  detail: string;
  icon: typeof CircleHelp;
}> = [
  {
    id: 'custom',
    title: 'Build my own',
    description: 'Start with no visible categories and shape the structure yourself.',
    detail: 'SaveSlate still keeps a hidden system category so imports and uncategorized transactions stay stable.',
    icon: CircleHelp,
  },
  {
    id: 'minimal',
    title: 'Minimal starter list',
    description: 'Keep the essentials for a lighter first setup.',
    detail: 'You get a short list across living, income, and transfers, then add more later as you go.',
    icon: Wallet,
  },
  {
    id: 'full',
    title: 'Full category set',
    description: 'Seed the full built-in catalog from day one.',
    detail: 'Best if you want the current SaveSlate category structure immediately available across the app.',
    icon: Layers3,
  },
];

export function OnboardingGate() {
  const { completeOnboarding, isOnboardingComplete } = useOnboarding();
  const { defaultCurrency } = useSettings();
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [selectedPreset, setSelectedPreset] = useState<CategoryPreset>('minimal');

  useEffect(() => {
    setSelectedCurrency(defaultCurrency);
  }, [defaultCurrency]);

  const currencyOptions = useMemo(
    () => getCurrencyOptionsWithFallback(selectedCurrency),
    [selectedCurrency],
  );

  if (isOnboardingComplete) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/88 px-4 py-6 backdrop-blur-sm">
      <Card className="w-full max-w-4xl overflow-hidden shadow-(--shadow-lg)">
        <CardHeader className="border-b border-border/80 bg-linear-to-br from-primary/14 via-card to-card">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Set up SaveSlate</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Pick your base currency and how much category structure you want to start with. You can edit both later, but this gives the app sensible first-run defaults right away.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-8 p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-currency">Default currency</Label>
              <p className="text-sm text-muted-foreground">
                New accounts and transactions will start with this currency unless you override them.
              </p>
            </div>

            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger id="onboarding-currency" className="w-full">
                <SelectValue placeholder="Choose a currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((currencyOption) => (
                  <SelectItem key={currencyOption.code} value={currencyOption.code}>
                    {currencyOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-xl border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground">
              You can always change this later in <span className="font-medium text-foreground">Settings</span>. The onboarding choice just removes the first-run CHF fallback from new forms.
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category setup</Label>
              <p className="text-sm text-muted-foreground">
                Choose whether SaveSlate starts nearly blank, with a lean starter list, or with the full built-in preset catalog.
              </p>
            </div>

            <div className="grid gap-3">
              {CATEGORY_PRESET_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = option.id === selectedPreset;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={[
                      'rounded-2xl border px-4 py-4 text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/8 shadow-(--shadow-sm)'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/25',
                    ].join(' ')}
                    onClick={() => setSelectedPreset(option.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={[
                        'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl',
                        isSelected ? 'bg-primary/14 text-primary' : 'bg-muted text-muted-foreground',
                      ].join(' ')}>
                        <Icon className="size-4" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{option.title}</span>
                          {isSelected ? (
                            <span className="rounded-full bg-primary/14 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-foreground/90">{option.description}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{option.detail}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </CardContent>

        <CardFooter className="justify-between gap-4 border-t border-border/80 bg-card/95">
          <p className="text-sm text-muted-foreground">
            This is a local-first setup. Nothing leaves the browser, and you can revise the category structure later.
          </p>
          <Button
            onClick={() => completeOnboarding({
              defaultCurrency: selectedCurrency,
              categoryPreset: selectedPreset,
            })}
          >
            Start with these defaults
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
