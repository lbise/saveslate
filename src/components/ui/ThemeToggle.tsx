import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative flex items-center w-14 h-8 rounded-full p-1',
        'transition-colors duration-300 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        isDark ? 'bg-accent' : 'bg-border',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Toggle knob */}
      <span
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full',
          'bg-white shadow-md',
          'transition-transform duration-300 ease-in-out',
          isDark ? 'translate-x-6' : 'translate-x-0'
        )}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-accent" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </span>

      {/* Background icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Sun
          className={cn(
            'w-3.5 h-3.5 transition-opacity duration-300',
            isDark ? 'opacity-50 text-white/50' : 'opacity-0'
          )}
        />
        <Moon
          className={cn(
            'w-3.5 h-3.5 transition-opacity duration-300',
            isDark ? 'opacity-0' : 'opacity-50 text-gray-400'
          )}
        />
      </span>
    </button>
  );
}
