import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Full-width page loading skeleton with header and content area */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12', className)}>
      {/* Header skeleton */}
      <div className="mb-10 flex items-start justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Stat row */}
      <div className="flex flex-wrap gap-10 mb-12">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Content cards */}
      <div className="space-y-4">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={6} />
      </div>
    </div>
  );
}

/** Skeleton for a stat card (dot + value + label) */
export function SkeletonStatCard() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-2 w-2 rounded-full" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}

/** Skeleton for a card with N text lines */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i % 2 === 0 ? 'w-full' : 'w-3/4')} />
      ))}
    </div>
  );
}

/** Skeleton for a list row (icon + text + value) */
export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="flex flex-col flex-1 gap-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

/** Skeleton for a table with rows */
export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className={cn('h-4 flex-1', i % 3 === 0 ? 'max-w-[200px]' : 'max-w-[300px]')} />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Dashboard-specific skeleton */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Balance */}
      <div className="mb-12">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-12 w-52 mb-7" />
        <div className="flex flex-wrap gap-10">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-10">
        <div className="flex flex-col gap-10">
          {/* Accounts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </div>
          {/* Top spending */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </div>
          {/* Recent activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </div>
        </div>
        {/* Right column */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Transactions page skeleton */
export function TransactionsSkeleton() {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <Skeleton className="h-8 w-44" />
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
      </div>
      {/* Type pills */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-22 rounded-full" />
      </div>
      {/* Table */}
      <SkeletonTable rows={10} />
    </div>
  );
}

/** Generic entity list page skeleton (Accounts, Categories, Goals, Rules) */
export function EntityListSkeleton({ cardCount = 4, title }: { cardCount?: number; title?: string }) {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <Skeleton className={cn('h-8', title ? 'w-36' : 'w-32')} />
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      {/* Entity cards */}
      <div className="grid gap-4">
        {Array.from({ length: cardCount }, (_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}

/** Analytics page skeleton */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-64" />
      </div>
      {/* Stat row */}
      <div className="flex flex-wrap gap-10 mb-8">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      {/* Chart placeholder */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
      {/* Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-48 w-48 rounded-full mx-auto" />
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-48 w-48 rounded-full mx-auto" />
        </div>
      </div>
    </div>
  );
}
