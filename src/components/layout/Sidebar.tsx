import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Wallet,
  Target,
  Tags,
  Bot,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getInitials } from '../../context';
import { useUser } from '../../hooks';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Transactions', path: '/transactions', icon: Receipt },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Accounts', path: '/accounts', icon: Wallet },
  { label: 'Goals', path: '/goals', icon: Target },
  { label: 'Categories', path: '/categories', icon: Tags },
  { label: 'Rules', path: '/rules', icon: Bot },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Help', path: '/help', icon: HelpCircle },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useUser();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On mobile, always show as collapsed
  const isCollapsed = isMobile || collapsed;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-100 flex flex-col',
        'bg-surface border-r border-border',
        'transition-[width] duration-200 ease-out',
      )}
      style={{ width: isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center border-b border-border',
          isCollapsed ? 'justify-center px-4 py-6' : 'justify-between px-6 py-6',
        )}
      >
        {!isCollapsed && (
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 whitespace-nowrap overflow-hidden text-text hover:text-text transition-colors"
            style={{ textDecoration: 'none' }}
          >
            <span className="w-8 h-8 rounded-(--radius-md) border border-accent/40 bg-accent/12 text-accent flex items-center justify-center shrink-0">
              <PiggyBank size={16} />
            </span>
            <span
              className="text-text"
              style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, letterSpacing: '-0.03em' }}
            >
              SaveSlate
            </span>
          </Link>
        )}
        {isCollapsed && isMobile && (
          <Link
            to="/"
            className="w-8 h-8 rounded-(--radius-md) border border-accent/40 bg-accent/12 text-accent flex items-center justify-center hover:border-accent transition-colors"
            style={{ textDecoration: 'none' }}
          >
            <PiggyBank size={16} />
          </Link>
        )}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'rounded-(--radius-sm) bg-transparent border border-border',
              'text-text-muted hover:text-text hover:border-text-muted',
              'flex items-center justify-center transition-all duration-150',
              isCollapsed ? 'h-8 min-w-12 px-1.5 gap-1.5' : 'w-7 h-7',
            )}
          >
            {isCollapsed ? (
              <>
                <span className="w-6 h-6 rounded-(--radius-sm) border border-accent/40 bg-accent/12 text-accent flex items-center justify-center">
                  <PiggyBank size={12} />
                </span>
                <ChevronLeft size={14} className="rotate-180" />
              </>
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                isActive ? 'nav-link-active' : 'nav-link',
                isCollapsed && 'justify-center px-3',
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
            )}
          </NavLink>
        ))}

        {/* Bottom section */}
        <div className="mt-auto pt-4 border-t border-border flex flex-col gap-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  isActive ? 'nav-link-active' : 'nav-link',
                  isCollapsed && 'justify-center px-3',
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!isCollapsed && (
                <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User */}
      <div
        className={cn(
          'flex items-center gap-3 border-t border-border',
          isCollapsed ? 'justify-center px-3 py-4' : 'px-4 py-4',
        )}
      >
        <div
          className="w-9 h-9 rounded-(--radius-md) bg-border flex items-center justify-center shrink-0"
          style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 500 }}
        >
          {getInitials(user.name)}
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-body font-medium truncate">{user.name}</div>
            </div>
            <button
              onClick={logout}
              className={cn(
                'w-8 h-8 rounded-(--radius-sm) bg-transparent border-none',
                'text-text-muted hover:text-expense hover:bg-expense/10',
                'flex items-center justify-center transition-all duration-150',
              )}
            >
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
