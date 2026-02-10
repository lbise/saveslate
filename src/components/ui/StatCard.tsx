interface StatCardProps {
  label: string;
  value: string;
  dotColor: 'income' | 'expense' | 'muted';
}

const dotColors: Record<StatCardProps['dotColor'], string> = {
  income: 'bg-income',
  expense: 'bg-expense',
  muted: 'bg-text-secondary',
};

export function StatCard({ label, value, dotColor }: StatCardProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${dotColors[dotColor]}`} />
      <div className="flex flex-col gap-0.5">
        <span
          className="text-base font-medium text-text"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </span>
        <span className="text-ui text-text-muted">{label}</span>
      </div>
    </div>
  );
}
