import * as LucideIcons from 'lucide-react';
import type { CSSProperties } from 'react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
  style?: CSSProperties;
}

export function Icon({ name, className, size = 20, style }: IconProps) {
  // Get the icon component from lucide-react
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number; style?: CSSProperties }>>;
  const IconComponent = icons[name];

  if (!IconComponent) {
    // Fallback to a circle if icon not found
    return (
      <div
        className={`rounded-full bg-current opacity-50 ${className ?? ''}`}
        style={{ width: size, height: size, ...style }}
      />
    );
  }

  return <IconComponent className={className} size={size} style={style} />;
}
