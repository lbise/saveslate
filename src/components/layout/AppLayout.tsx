import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { OnboardingGate } from './OnboardingGate';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effectiveCollapsed = isMobile || sidebarCollapsed;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main content */}
      <div
        className="flex-1 min-h-screen transition-[margin-left] duration-200 ease-out"
        style={{
          marginLeft: effectiveCollapsed
            ? 'var(--sidebar-collapsed)'
            : 'var(--sidebar-width)',
        }}
      >
        <main className="overflow-auto">
          <Outlet />
        </main>
      </div>

      <OnboardingGate />
    </div>
  );
}
