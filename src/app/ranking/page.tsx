import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";

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
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <Trophy className="h-6 w-6 text-primary" />
        おすすめクーポン
      </h1>
      <p className="mt-2 text-sm text-muted">
        GET数・閲覧数をもとに、人気のクーポンをピックアップしました。
      </p>

      <ol className="mt-8 flex flex-col gap-3">
        {ranked.length === 0 && (
          <p className="text-sm text-muted">
            まだデータがありません。
          </p>
        )}
        {ranked.map(({ coupon }) => {
          if (!coupon.stores) return null;
          const c = CATEGORIES.find((x) => x.value === coupon.stores!.category);
          const a = AREAS.find((x) => x.value === coupon.stores!.area);
          const Icon = c ? CATEGORY_ICONS[c.value] : null;

          return (
            <li key={coupon.id}>
              <Link
                href={`/coupons/${coupon.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {Icon && <Icon className="h-6 w-6" strokeWidth={2} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <span>
                      {c?.ja}
                    </span>
                    <span>・</span>
                    <span className="flex items-center gap-0.5">
                      <AreaIcon className="h-3 w-3" />
                      {a?.ja}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-medium">{coupon.stores.name}</span>
                  <span className="mt-1 block text-lg font-bold text-primary">{coupon.title}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
