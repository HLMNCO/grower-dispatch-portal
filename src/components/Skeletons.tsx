import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Search bar */}
      <Skeleton className="h-10 w-full" />
      {/* List items */}
      <div className="rounded-lg border border-border overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupplierHomeSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Greeting */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
            <Skeleton className="h-7 w-8" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full sm:w-56" />
      {/* Dispatch cards */}
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-4 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReceiveQueueSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <Skeleton className="h-10 w-full" />
      {['Today', 'Tomorrow'].map(label => (
        <div key={label} className="space-y-2">
          <Skeleton className="h-3 w-32" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PlanningSkeletons() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-44" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/30">
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="grid grid-cols-7 divide-x divide-border">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="p-3 space-y-2">
              <Skeleton className="h-3 w-6 mx-auto" />
              <Skeleton className="h-3 w-8 mx-auto" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-4 w-6 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DispatchDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-4 w-32" />)}
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-border last:border-0">
            <Skeleton className="h-4 w-24 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
