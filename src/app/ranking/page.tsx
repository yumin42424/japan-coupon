import Link from "next/link";
import { Trophy } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";
import { JaKo } from "@/components/ja-ko";

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

const MEDAL_STYLES = [
  "bg-yellow-400/15 text-yellow-500 border-yellow-400/40",
  "bg-slate-400/15 text-slate-400 border-slate-400/40",
  "bg-amber-700/15 text-amber-600 border-amber-700/40",
];

export default async function RankingPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [couponsRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("coupons")
      .select("id, title, discount_info, valid_to, stores(id, name, category, area)")
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
        <JaKo ja="人気ランキング" ko="인기 랭킹" />
      </h1>
      <p className="mt-2 text-sm text-muted">
        <JaKo
          ja="会員がGETした数が多い順に表示しています。"
          ko="회원들이 많이 받아간 순서대로 보여드려요."
        />
      </p>

      <ol className="mt-8 flex flex-col gap-3">
        {ranked.length === 0 && (
          <p className="text-sm text-muted">
            <JaKo ja="まだデータがありません。" ko="아직 데이터가 없습니다." />
          </p>
        )}
        {ranked.map(({ coupon, issue }, i) => {
          if (!coupon.stores) return null;
          const c = CATEGORIES.find((x) => x.value === coupon.stores!.category);
          const a = AREAS.find((x) => x.value === coupon.stores!.area);
          const Icon = c ? CATEGORY_ICONS[c.value] : null;
          const medal = MEDAL_STYLES[i];

          return (
            <li key={coupon.id}>
              <Link
                href={`/coupons/${coupon.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold ${
                    medal ?? "border-border bg-background text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {Icon && <Icon className="h-6 w-6" strokeWidth={2} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <span>
                      {c?.ja}({c?.ko})
                    </span>
                    <span>・</span>
                    <span className="flex items-center gap-0.5">
                      <AreaIcon className="h-3 w-3" />
                      {a?.ja}({a?.ko})
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-medium">{coupon.stores.name}</span>
                  <span className="mt-1 block text-lg font-bold text-primary">{coupon.title}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted">
                  <span className="block font-bold text-foreground">{issue}</span>
                  <JaKo ja="GET数" ko="발급 수" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
