import { useMemo, useState, type FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Search, X } from 'lucide-react';
import { getCurrencyOptionsWithFallback } from '../../lib/currencies';
import { Icon } from '../ui';
import {
  ACCOUNT_TYPE_DEFAULT_ICONS,
  ACCOUNT_TYPE_LABELS,
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
  const [form, setForm] = useState<AccountFormState>(initialValues);
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

    const payload = toAccountFormSubmitPayload(form);
    if (!payload) {
      return;
    }

    onSubmit(payload);
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-bg/70" onClick={onCancel} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <section className="card w-full max-w-xl p-5">
          <div className="section-header mb-4">
            <h2 className="heading-3 text-text">
              {isEditing ? 'Edit Account' : 'Create Account'}
            </h2>
            <button type="button" className="btn-icon" onClick={onCancel}>
              <X size={16} />
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-1.5 block" htmlFor="account-name">
                  Name
                </label>
                <input
                  id="account-name"
                  className="input"
                  placeholder="Daily account"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="label mb-1.5 block" htmlFor="account-type">
                  Type
                </label>
                <select
                  id="account-type"
                  className="select"
                  value={form.type}
                  onChange={(event) => {
                    const nextType = event.target.value as AccountType;
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
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-1.5 block" htmlFor="account-starting-balance">
                  Starting balance
                </label>
                <input
                  id="account-starting-balance"
                  className="input"
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
                <label className="label mb-1.5 block" htmlFor="account-currency">
                  Currency
                </label>
                <select
                  id="account-currency"
                  className="select"
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, currency: event.target.value }))
                  }
                  required
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.label} ({currency.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="account-identifier">
                Account number / IBAN (optional)
              </label>
              <input
                id="account-identifier"
                className="input"
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

            <div className="relative">
              <label className="label mb-1.5 block" htmlFor="account-icon-search">
                Icon
              </label>
              <button
                type="button"
                className="input flex items-center justify-between"
                onClick={() => setIsIconPickerOpen((current) => !current)}
                aria-expanded={isIconPickerOpen}
                aria-controls="account-icon-picker"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon name={form.icon} size={16} className="text-text" />
                  <span className="text-body text-text truncate">{form.icon}</span>
                </span>
                <ChevronDown size={16} className="text-text-muted" />
              </button>

              {isIconPickerOpen && (
                <div id="account-icon-picker" className="card absolute z-20 mt-2 w-full p-3">
                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      id="account-icon-search"
                      className="input pl-9"
                      placeholder="Search icon"
                      value={iconSearchQuery}
                      onChange={(event) => setIconSearchQuery(event.target.value)}
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-(--radius-md) border border-border">
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
                            'w-full flex items-center gap-2 px-3 py-2 text-left border-none bg-transparent',
                            'transition-colors duration-150',
                            isSelected
                              ? 'bg-surface-hover text-text'
                              : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                          ].join(' ')}
                        >
                          <Icon name={iconName} size={16} />
                          <span className="text-ui">{iconName}</span>
                        </button>
                      );
                    })}

                    {filteredIconNames.length === 0 && (
                      <div className="px-3 py-4 text-ui text-text-muted">
                        No icons found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
