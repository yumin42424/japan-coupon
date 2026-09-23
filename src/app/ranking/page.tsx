import { Trophy } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CouponCard } from "@/components/coupon-card";

type CouponRow = {
  id: string;
  title: string;
  discount_info: string | null;
  valid_to: string;
  stores: {
    id: string;
    name: string;
    category: string;
    area: string;
  } | null;
};

export default async function RankingPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [couponsRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("coupons")
      .select("id, title, discount_info, valid_to, stores!inner(id, name, category, area)")
      .eq("is_active", true)
      .eq("stores.is_active", true)
      .gte("valid_to", today),
    supabaseAdmin.from("coupon_events").select("coupon_id, event_type").in("event_type", ["issue", "view"]),
  ]);

  const coupons = (couponsRes.data ?? []) as unknown as CouponRow[];
  const counts = new Map<string, { issue: number; view: number }>();
  for (const e of (eventsRes.data ?? []) as { coupon_id: string; event_type: "issue" | "view" }[]) {
    const entry = counts.get(e.coupon_id) ?? { issue: 0, view: 0 };
    entry[e.event_type]++;
    counts.set(e.coupon_id, entry);
  }

  const ranked = coupons
    .map((c) => ({ coupon: c, ...(counts.get(c.id) ?? { issue: 0, view: 0 }) }))
    .sort((a, b) => b.issue - a.issue || b.view - a.view)
    .slice(0, 10);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-h1 font-display tracking-tight">
        <Trophy className="h-6 w-6 text-primary" />
        おすすめクーポン
      </h1>
      <p className="mt-2 text-body text-muted">
        GET数・閲覧数をもとに、人気のクーポンをピックアップしました。
      </p>

      {ranked.length === 0 ? (
        <p className="mt-8 text-body text-muted">
          まだデータがありません。
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ranked.map(({ coupon }) => {
            if (!coupon.stores) return null;
            return (
              <CouponCard
                key={coupon.id}
                href={`/coupons/${coupon.id}`}
                category={coupon.stores.category as (typeof CATEGORIES)[number]["value"]}
                area={coupon.stores.area as (typeof AREAS)[number]["value"]}
                storeName={coupon.stores.name}
                benefit={coupon.title}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
