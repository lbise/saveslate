import {
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { Globe, DollarSign, Shield, Download, Trash2, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useClearAllData } from '../hooks/api';

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
  const {
    defaultCurrency,
    preferredLanguage,
    aiTranslateDescriptions,
    setDefaultCurrency,
    setPreferredLanguage,
    setAiTranslateDescriptions,
  } = useSettings();
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [clearDataError, setClearDataError] = useState<string | null>(null);
  const clearAllData = useClearAllData();
  const currencyOptions = useMemo(
    () => getCurrencyOptionsWithFallback(defaultCurrency),
    [defaultCurrency],
  );

  function handleDefaultCurrencyChange(value: string) {
    setDefaultCurrency(value);
    toast.success("Default currency updated");
  }

  function handleLanguageChange(value: 'en' | 'de' | 'fr') {
    setPreferredLanguage(value);
    toast.success('Language preference updated');
  }

  function handleAiTranslateDescriptionsChange(checked: boolean) {
    setAiTranslateDescriptions(checked);
    toast.success(
      checked
        ? 'AI description translation enabled'
        : 'AI description translation disabled',
    );
  }

  async function handleConfirmClearAllData() {
    try {
      setClearDataError(null);
      await clearAllData.mutateAsync();
      toast.success('All data has been cleared');
      setIsClearDataModalOpen(false);
    } catch {
      setClearDataError('Failed to clear your saved data. Please try again.');
    }
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      <PageHeader title="Settings" />

      {isClearDataModalOpen && (
        <DeleteConfirmationModal
          title="Clear all data?"
          description="This will permanently delete all your financial data."
          details={(
            <p className="text-sm text-dimmed">
              This includes transactions, import batches, accounts, goals, tags, automation rules, and parser presets.
            </p>
          )}
          note="Your account and preferences (currency, language, AI translation preference) will be kept. This action cannot be undone."
          confirmLabel={clearAllData.isPending ? 'Clearing...' : 'Clear all data'}
          onConfirm={() => {
            void handleConfirmClearAllData();
          }}
          onClose={() => {
            if (!clearAllData.isPending) {
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
            description="Preferred language for AI-assisted import descriptions"
          >
            <Select value={preferredLanguage} onValueChange={handleLanguageChange}>
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
            icon={Sparkles}
            label="AI Description Translation"
            description="Translate AI-cleaned import descriptions into your preferred language"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={aiTranslateDescriptions}
                onCheckedChange={(checked) => {
                  handleAiTranslateDescriptionsChange(checked === true);
                }}
                aria-label="Translate AI-cleaned import descriptions"
              />
              <span className="text-sm text-foreground">
                {aiTranslateDescriptions ? 'Enabled' : 'Disabled'}
              </span>
            </div>
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
