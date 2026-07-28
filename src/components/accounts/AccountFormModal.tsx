import { useMemo, useState, type FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Search } from 'lucide-react';
import { getCurrencyOptionsWithFallback } from '../../lib/currencies';
import { useSettings } from '../../hooks';
import { Icon } from '../ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ACCOUNT_TYPE_DEFAULT_ICONS,
  ACCOUNT_TYPE_LABELS,
  DEFAULT_ACCOUNT_FORM_STATE,
  toAccountFormSubmitPayload,
  type AccountFormState,
  type AccountFormSubmitPayload,
} from './account-form';
import type { AccountType } from '../../types';

interface AccountFormModalProps {
  mode: 'create' | 'edit';
  initialValues: AccountFormState;
  onCancel: () => void;
  onSubmit: (payload: AccountFormSubmitPayload) => void;
}

export function AccountFormModal({
  mode,
  initialValues,
  onCancel,
  onSubmit,
}: AccountFormModalProps) {
  const { defaultCurrency } = useSettings();
  const [form, setForm] = useState<AccountFormState>(() => ({
    ...initialValues,
    currency:
      mode === 'create' && initialValues.currency === DEFAULT_ACCOUNT_FORM_STATE.currency
        ? defaultCurrency
        : initialValues.currency || defaultCurrency,
  }));
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const allIconNames = useMemo(
    () => Object.keys(LucideIcons.icons).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filteredIconNames = useMemo(() => {
    const query = iconSearchQuery.trim().toLowerCase();
    if (!query) return allIconNames;
    return allIconNames.filter((iconName) =>
      iconName.toLowerCase().includes(query),
    );
  }, [allIconNames, iconSearchQuery]);

  const currencyOptions = useMemo(
    () => getCurrencyOptionsWithFallback(form.currency),
    [form.currency],
  );

  const isEditing = mode === 'edit';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toAccountFormSubmitPayload(form, defaultCurrency);
    if (!payload) {
      return;
    }

    onSubmit(payload);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Account' : 'Create Account'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the account details used across balances and transactions.'
              : 'Add an account to start tracking its balance and transactions.'}
          </DialogDescription>
        </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block" htmlFor="account-name">
                  Name
                </Label>
                <Input
                  id="account-name"
                  placeholder="Daily account"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label className="mb-1.5 block" htmlFor="account-type">
                  Type
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => {
                    const nextType = value as AccountType;
                    setForm((current) => {
                      const nextIcon =
                        current.icon === ACCOUNT_TYPE_DEFAULT_ICONS[current.type]
                          ? ACCOUNT_TYPE_DEFAULT_ICONS[nextType]
                          : current.icon;

                      return {
                        ...current,
                        type: nextType,
                        icon: nextIcon,
                      };
                    });
                  }}
                >
                  <SelectTrigger id="account-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block" htmlFor="account-starting-balance">
                  Starting balance
                </Label>
                <Input
                  id="account-starting-balance"
                  type="number"
                  step="0.01"
                  value={form.startingBalance}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startingBalance: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label className="mb-1.5 block" htmlFor="account-currency">
                  Currency
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, currency: value }))
                  }
                >
                  <SelectTrigger id="account-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.label} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block" htmlFor="account-identifier">
                Account number / IBAN (optional)
              </Label>
              <Input
                id="account-identifier"
                placeholder="CH97 0029 0290 IN11 3984 2"
                value={form.accountIdentifier}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accountIdentifier: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label className="mb-1.5 block" htmlFor="account-icon-trigger">
                Icon
              </Label>
              <Popover open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="account-icon-trigger"
                    type="button"
                    className="flex h-11 w-full items-center justify-between rounded-md border border-border bg-card px-4 text-base text-foreground outline-none transition-colors hover:border-dimmed focus-visible:ring-2 focus-visible:ring-ring active:bg-secondary"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon name={form.icon} size={16} className="text-foreground" />
                      <span className="truncate">{form.icon}</span>
                    </span>
                    <ChevronDown size={16} className="text-dimmed" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  id="account-icon-picker"
                  align="start"
                  className="w-(--radix-popover-trigger-width) p-3"
                >
                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-dimmed"
                    />
                    <Input
                      id="account-icon-search"
                      className="pl-9"
                      placeholder="Search icon"
                      value={iconSearchQuery}
                      onChange={(event) => setIconSearchQuery(event.target.value)}
                    />
                  </div>

                  <ScrollArea className="h-64 rounded-(--radius-md) border border-border">
                    {filteredIconNames.map((iconName) => {
                      const isSelected = form.icon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => {
                            setForm((current) => ({ ...current, icon: iconName }));
                            setIsIconPickerOpen(false);
                          }}
                          className={[
                            'flex min-h-11 w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left',
                            'transition-colors duration-150',
                            isSelected
                              ? 'bg-secondary text-foreground'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          ].join(' ')}
                        >
                          <Icon name={iconName} size={16} />
                          <span className="text-sm">{iconName}</span>
                        </button>
                      );
                    })}

                    {filteredIconNames.length === 0 && (
                      <div className="px-3 py-4 text-sm text-dimmed">
                        No icons found.
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Save Changes' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
