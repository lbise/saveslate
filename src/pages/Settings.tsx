import {
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { Globe, DollarSign, Bell, Shield, Download, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmationModal } from '../components/ui';
import { getCurrencyOptionsWithFallback } from '../lib/currencies';
import { useSettings } from '../hooks';

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
        <div className="w-9 h-9 bg-card rounded-(--radius-md) flex items-center justify-center shrink-0">
          <IconComp size={16} className="text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-medium text-foreground">{label}</div>
           <div className="text-sm text-dimmed">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Settings() {
  const { defaultCurrency, setDefaultCurrency } = useSettings();
  const [language, setLanguage] = useState('en');
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearDataError, setClearDataError] = useState<string | null>(null);
  const currencyOptions = useMemo(
    () => getCurrencyOptionsWithFallback(defaultCurrency),
    [defaultCurrency],
  );

  function handleDefaultCurrencyChange(value: string) {
    setDefaultCurrency(value);
    toast.success("Default currency updated");
  }

  async function handleConfirmClearAllData() {
    try {
      setIsClearingData(true);
      setClearDataError(null);
      // TODO: Add API endpoint to delete all user data
      localStorage.clear();
      window.location.reload();
    } catch {
      setIsClearingData(false);
      setClearDataError('Failed to clear your saved data. Please try again.');
    }
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      <PageHeader title="Settings" />

      {isClearDataModalOpen && (
        <DeleteConfirmationModal
          title="Clear all data?"
          description="This will permanently delete all saved financial data on this device."
          details={(
            <p className="text-sm text-dimmed">
              This includes transactions, import batches, accounts, goals, tags, automation rules, and parser presets.
            </p>
          )}
          note="Your preferences like default currency and data profile will be kept. This action cannot be undone."
          confirmLabel={isClearingData ? 'Clearing...' : 'Clear all data'}
          onConfirm={() => {
            void handleConfirmClearAllData();
          }}
          onClose={() => {
            if (!isClearingData) {
              setIsClearDataModalOpen(false);
            }
          }}
        />
      )}

      {/* General */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-medium text-muted-foreground">General</h2>
        </div>
        <div className="flex flex-col">
          <SettingRow
            icon={Globe}
            label="Language"
            description="Display language for the app"
          >
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-auto text-sm py-2 px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Fran&ccedil;ais</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow
            icon={DollarSign}
            label="Currency"
            description="Default currency for transactions"
          >
            <Select value={defaultCurrency} onValueChange={handleDefaultCurrencyChange}>
              <SelectTrigger className="w-auto text-sm py-2 px-3">
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
          </SettingRow>
          <SettingRow
            icon={Bell}
            label="Notifications"
            description="Receive alerts for splits and goals"
          >
            <Button variant="outline" size="sm">
              Enabled
            </Button>
          </SettingRow>
        </div>
      </section>

      {/* Privacy & Security */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-medium text-muted-foreground">Privacy & Security</h2>
        </div>
        <div className="flex flex-col">
          <SettingRow
            icon={Shield}
            label="Data Privacy"
            description="Your data is stored securely on the server"
          >
            <Badge variant="income">Encrypted</Badge>
          </SettingRow>
        </div>
      </section>

      {/* Data */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-medium text-muted-foreground">Data</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {clearDataError && (
            <p className="text-sm text-expense">{clearDataError}</p>
          )}
          <button className="flex items-center gap-3 w-full p-3.5 bg-card rounded-(--radius-md) text-left transition-colors duration-150 hover:bg-secondary cursor-pointer border-none">
            <div className="w-9 h-9 bg-background rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <Download size={16} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-base text-foreground">Export Data</div>
               <div className="text-sm text-dimmed">Download all transactions as CSV</div>
            </div>
          </button>
          <button
            className="flex items-center gap-3 w-full p-3.5 bg-card rounded-(--radius-md) text-left transition-colors duration-150 hover:bg-secondary cursor-pointer border-none"
            onClick={() => {
              setClearDataError(null);
              setIsClearDataModalOpen(true);
            }}
          >
            <div className="w-9 h-9 bg-background rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <Trash2 size={16} className="text-expense" />
            </div>
            <div>
              <div className="text-base text-expense">Clear All Data</div>
              <div className="text-sm text-dimmed">
                Permanently delete all saved transactions, accounts, goals, rules, tags, and parser presets
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* App Info */}
      <section className="pt-4">
        <div className="text-center">
          <div
             className="text-base text-dimmed"
             style={{ fontFamily: 'var(--font-display)' }}
           >
             SaveSlate v0.1.0
            </div>
           <div className="text-sm text-dimmed mt-1">
            Made with care in Switzerland
          </div>
        </div>
      </section>
    </div>
  );
}
