import type { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

export function ActionCard({ icon: Icon, label, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 px-3.5 bg-surface rounded-(--radius-md) text-ui text-left transition-all duration-150 hover:bg-surface-hover hover:text-text border-none cursor-pointer"
    >
      <div className="w-7 h-7 bg-bg rounded-(--radius-sm) flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      {label}
    </button>
  );
}
