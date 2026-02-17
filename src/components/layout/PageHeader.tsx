import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4" style={{ marginBottom: '56px' }}>
      <h1 className="heading-1">{title}</h1>
      {children && (
        <div className="flex items-start gap-3">
          {children}
        </div>
      )}
    </header>
  );
}
