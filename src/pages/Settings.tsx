import {
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Globe, DollarSign, Bell, Shield, Download, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { getCurrencyOptionsWithFallback } from '../lib/currencies';

const DEFAULT_CURRENCY_STORAGE_KEY = 'melomoney:settings:default-currency';
const FALLBACK_CURRENCY = 'CHF';

function loadDefaultCurrencySetting(): string {
  try {
    const rawCurrency = localStorage.getItem(DEFAULT_CURRENCY_STORAGE_KEY);
    if (!rawCurrency) {
      return FALLBACK_CURRENCY;
    }

    const normalizedCurrency = rawCurrency.trim().toUpperCase();
    return normalizedCurrency || FALLBACK_CURRENCY;
  } catch {
    return FALLBACK_CURRENCY;
  }
}

function saveDefaultCurrencySetting(currencyCode: string): void {
  localStorage.setItem(DEFAULT_CURRENCY_STORAGE_KEY, currencyCode);
}

interface SettingRowProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
  children: ReactNode;
}

function SettingRow({ icon: IconComp, label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 bg-surface rounded-(--radius-md) flex items-center justify-center shrink-0">
          <IconComp size={16} className="text-text-secondary" />
        </div>
        <div className="min-w-0">
          <div className="text-body font-medium text-text">{label}</div>
           <div className="text-ui text-text-muted">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Settings() {
  const [defaultCurrency, setDefaultCurrency] = useState(loadDefaultCurrencySetting);
  const currencyOptions = useMemo(
    () => getCurrencyOptionsWithFallback(defaultCurrency),
    [defaultCurrency],
  );

  function handleDefaultCurrencyChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextCurrency = event.target.value;
    setDefaultCurrency(nextCurrency);
    saveDefaultCurrencySetting(nextCurrency);
  }

  return (
    <div className="page-container">
      <PageHeader title="Settings" />

      {/* General */}
      <section>
        <div className="section-header">
          <h2 className="section-title">General</h2>
        </div>
        <div className="flex flex-col">
          <SettingRow
            icon={Globe}
            label="Language"
            description="Display language for the app"
          >
            <select className="select w-auto text-sm py-2 px-3">
              <option>English</option>
              <option>Deutsch</option>
              <option>Fran&ccedil;ais</option>
            </select>
          </SettingRow>
          <SettingRow
            icon={DollarSign}
            label="Currency"
            description="Default currency for transactions"
          >
            <select
              className="select w-auto text-sm py-2 px-3"
              value={defaultCurrency}
              onChange={handleDefaultCurrencyChange}
            >
              {currencyOptions.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label} ({currency.code})
                </option>
              ))}
            </select>
          </SettingRow>
          <SettingRow
            icon={Bell}
            label="Notifications"
            description="Receive alerts for splits and goals"
          >
            <button className="btn-secondary py-1.5 px-3">
              Enabled
            </button>
          </SettingRow>
        </div>
      </section>

      {/* Privacy & Security */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Privacy & Security</h2>
        </div>
        <div className="flex flex-col">
          <SettingRow
            icon={Shield}
            label="Data Privacy"
            description="All data is stored locally on your device"
          >
            <span className="badge-income">Local Only</span>
          </SettingRow>
        </div>
      </section>

      {/* Data */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Data</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          <button className="flex items-center gap-3 w-full p-3.5 bg-surface rounded-(--radius-md) text-left transition-colors duration-150 hover:bg-surface-hover cursor-pointer border-none">
            <div className="w-9 h-9 bg-bg rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <Download size={16} className="text-text-secondary" />
            </div>
            <div>
              <div className="text-body text-text">Export Data</div>
               <div className="text-ui text-text-muted">Download all transactions as CSV</div>
            </div>
          </button>
          <button className="flex items-center gap-3 w-full p-3.5 bg-surface rounded-(--radius-md) text-left transition-colors duration-150 hover:bg-surface-hover cursor-pointer border-none">
            <div className="w-9 h-9 bg-bg rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <Trash2 size={16} className="text-expense" />
            </div>
            <div>
              <div className="text-body text-expense">Clear All Data</div>
               <div className="text-ui text-text-muted">Permanently delete all transactions and goals</div>
            </div>
          </button>
        </div>
      </section>

      {/* App Info */}
      <section className="pt-4">
        <div className="text-center">
          <div
             className="text-muted"
             style={{ fontFamily: 'var(--font-display)' }}
           >
             MeloMoney v0.1.0
           </div>
           <div className="text-ui text-text-muted mt-1">
            Made with care in Switzerland
          </div>
        </div>
      </section>
    </div>
  );
}
