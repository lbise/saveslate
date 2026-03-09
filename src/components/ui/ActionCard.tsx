import { Button } from './button';
import type { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

export function ActionCard({ icon: Icon, label, onClick }: ActionCardProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="flex items-center justify-start gap-3 w-full h-auto p-3 px-3.5 bg-card text-sm text-muted-foreground text-left hover:bg-secondary hover:text-foreground cursor-pointer"
    >
      <div className="w-7 h-7 bg-background rounded-(--radius-sm) flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      {label}
    </Button>
  );
}
