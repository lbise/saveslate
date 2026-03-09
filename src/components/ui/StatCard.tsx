interface StatCardProps {
  label: string;
  value: string;
  dotColor: 'income' | 'expense' | 'transfer' | 'muted';
}

const dotColors: Record<StatCardProps['dotColor'], string> = {
  income: 'bg-income',
  expense: 'bg-expense',
  transfer: 'bg-transfer',
  muted: 'bg-muted-foreground',
};

export function StatCard({ label, value, dotColor }: StatCardProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${dotColors[dotColor]}`} />
      <div className="flex flex-col gap-0.5">
        <span
          className="text-base font-medium text-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </span>
        <span className="text-ui text-dimmed">{label}</span>
      </div>
    </div>
  );
}
