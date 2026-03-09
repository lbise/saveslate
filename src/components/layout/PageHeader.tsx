import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-col gap-4 sm:mb-11 sm:flex-row sm:items-start sm:justify-between">
      <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">{title}</h1>
      {children && (
        <div className="flex w-full flex-wrap items-start gap-2.5 sm:w-auto sm:justify-end">
          {children}
        </div>
      )}
    </header>
  );
}
