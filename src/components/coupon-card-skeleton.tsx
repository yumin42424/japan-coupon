export function CouponCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="aspect-[4/3] w-full animate-pulse bg-border/60" />
      <div className="space-y-2 p-3.5">
        <div className="h-3 w-2/3 animate-pulse rounded bg-border/60" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-border/60" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-border/60" />
      </div>
    </div>
  );
}
