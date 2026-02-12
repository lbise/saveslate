import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  Tags,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Transactions', path: '/transactions', icon: Receipt },
  { label: 'Accounts', path: '/accounts', icon: Wallet },
  { label: 'Goals', path: '/goals', icon: Target },
  { label: 'Categories', path: '/categories', icon: Tags },
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
            className="text-lg font-semibold tracking-tight whitespace-nowrap overflow-hidden text-text hover:text-text transition-colors"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', textDecoration: 'none' }}
          >
            <span className="text-accent">M</span>
            <span>eloMoney</span>
          </Link>
        )}
        {isCollapsed && (
          <Link
            to="/"
            className="text-lg font-semibold text-accent hover:text-accent transition-colors"
            style={{ fontFamily: 'var(--font-display)', textDecoration: 'none' }}
          >
            M
          </Link>
        )}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'w-7 h-7 rounded-(--radius-sm) bg-transparent border border-border',
              'text-text-muted hover:text-text hover:border-text-muted',
              'flex items-center justify-center transition-all duration-150',
              isCollapsed && 'rotate-180',
            )}
          >
            <ChevronLeft size={14} />
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
          JD
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-body font-medium truncate">John Doe</div>
              <div className="text-ui text-text-muted truncate">john@example.com</div>
            </div>
            <button
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
