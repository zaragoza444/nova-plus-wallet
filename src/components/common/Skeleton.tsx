interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps): JSX.Element {
  return <div className={`skeleton ${className}`.trim()} aria-hidden />;
}

export function TokenRowSkeleton(): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="ml-auto h-3.5 w-20" />
        <Skeleton className="ml-auto h-2.5 w-14" />
      </div>
    </div>
  );
}

export function TokenListSkeleton({ rows = 5 }: { rows?: number }): JSX.Element {
  return (
    <div className="glass-card divide-y divide-signet-border overflow-hidden" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <TokenRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function PortfolioSkeleton(): JSX.Element {
  return (
    <section className="glass-card-glow portfolio-anchor overflow-hidden p-5" aria-busy="true">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-3 h-10 w-48" />
      <Skeleton className="mt-4 h-16 w-full rounded-xl" />
    </section>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }): JSX.Element {
  return (
    <div className="glass-card space-y-3 p-5" aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === 0 ? "w-1/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function QRSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 py-6" aria-busy="true">
      <Skeleton className="h-[280px] w-[280px] rounded-2xl" />
      <Skeleton className="h-3 w-56" />
    </div>
  );
}
