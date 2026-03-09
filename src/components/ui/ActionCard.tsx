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
      className="flex items-center gap-3 w-full p-3 px-3.5 bg-card rounded-(--radius-md) text-sm text-muted-foreground text-left transition-all duration-150 hover:bg-secondary hover:text-foreground border-none cursor-pointer"
    >
      <div className="w-7 h-7 bg-background rounded-(--radius-sm) flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      {label}
    </button>
  );
}
