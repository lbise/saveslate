import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ui/ThemeToggle';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
  { label: 'Accounts', path: '/accounts', icon: Wallet },
  { label: 'Categories', path: '/categories', icon: Tags },
  { label: 'Settings', path: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 flex flex-col',
          'bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-text)]',
          'border-r border-[var(--color-sidebar-border)]',
          'transition-all duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-sidebar-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">MeloMoney</h1>
              <p className="text-xs text-[var(--color-sidebar-text-muted)]">
                Money, but fun!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-sidebar-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl',
                  'text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[var(--color-accent)] text-white shadow-lg'
                    : 'text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="p-4 border-t border-[var(--color-sidebar-border)]">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm font-medium text-[var(--color-sidebar-text-muted)]">
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Fun footer */}
        <div className="p-4 text-center">
          <p className="text-xs text-[var(--color-sidebar-text-muted)]">
            Money, made simple
          </p>
        </div>
      </aside>
    </>
  );
}
