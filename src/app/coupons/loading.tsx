import { CouponCardSkeleton } from "@/components/coupon-card-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="h-7 w-40 animate-pulse rounded bg-border/60" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CouponCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
