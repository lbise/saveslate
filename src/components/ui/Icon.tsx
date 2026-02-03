import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/utils';
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
        className={cn('rounded-full bg-current opacity-50', className)}
        style={{ width: size, height: size, ...style }}
      />
    );
  }

  return <IconComponent className={className} size={size} style={style} />;
}

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function CategoryIcon({
  icon,
  color,
  size = 'md',
  className,
}: CategoryIconProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon name={icon} size={iconSizes[size]} style={{ color }} className="flex-shrink-0" />
    </div>
  );
}
