import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Flame, Star, MapPin } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AREAS, CATEGORIES, type AreaValue } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";

type CouponRow = {
  id: string;
  title: string;
  member_only: boolean;
  created_at: string;
  stores: {
    id: string;
    name: string;
    category: string;
    line_available: boolean;
    popular_with_japanese: boolean;
  };
};

export function generateStaticParams() {
  return AREAS.map((a) => ({ area: a.value }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area: areaParam } = await params;
  const area = AREAS.find((a) => a.value === areaParam);
  if (!area) return {};

  return {
    title: `${area.ja} 日本人におすすめの韓国旅行スポット・限定クーポン`,
    description: `${area.ja}エリアで日本語対応・日本人に人気の飲食店/美容室/カフェなどを口コミ評価順にチェック。会員限定クーポンも配布中。`,
  };
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area: areaParam } = await params;
  const area = AREAS.find((a) => a.value === areaParam) as { value: AreaValue; ja: string; ko: string } | undefined;
  if (!area) notFound();

  const { data: couponRows } = await supabaseAdmin
    .from("coupons")
    .select(
      "id, title, member_only, created_at, stores!inner(id, name, category, line_available, popular_with_japanese)"
    )
    .eq("stores.area", area.value)
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .gte("valid_to", new Date().toISOString().slice(0, 10))
    .order("created_at", { ascending: false });

  const coupons = (couponRows ?? []) as unknown as CouponRow[];

  // 매장당 대표 쿠폰 하나만 남긴다 (가장 최근 등록된 것) — 지역 페이지는 매장 단위로 보여준다.
  const storeMap = new Map<
    string,
    { store: CouponRow["stores"]; couponId: string; couponTitle: string }
  >();
  for (const coupon of coupons) {
    if (!storeMap.has(coupon.stores.id)) {
      storeMap.set(coupon.stores.id, {
        store: coupon.stores,
        couponId: coupon.id,
        couponTitle: coupon.title,
      });
    }
  }
  const storeIds = [...storeMap.keys()];

  const ratingByStore = new Map<string, { avg: number; count: number }>();
  if (storeIds.length > 0) {
    const { data: reviewRows } = await supabaseAdmin
      .from("reviews")
      .select("store_id, rating")
      .in("store_id", storeIds);
    const grouped = new Map<string, number[]>();
    for (const r of reviewRows ?? []) {
      const list = grouped.get(r.store_id) ?? [];
      list.push(r.rating);
      grouped.set(r.store_id, list);
    }
    for (const [storeId, ratings] of grouped) {
      ratingByStore.set(storeId, {
        avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        count: ratings.length,
      });
    }
  }

  const entries = [...storeMap.values()].sort((a, b) => {
    const ra = ratingByStore.get(a.store.id)?.avg ?? -1;
    const rb = ratingByStore.get(b.store.id)?.avg ?? -1;
    if (ra !== rb) return rb - ra;
    if (a.store.popular_with_japanese !== b.store.popular_with_japanese) {
      return a.store.popular_with_japanese ? -1 : 1;
    }
    return a.store.name.localeCompare(b.store.name);
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="flex items-center gap-1 text-xs text-muted">
        <MapPin className="h-3.5 w-3.5" />
        エリアから探す
      </p>
      <h1 className="font-display mt-1 text-2xl font-black tracking-tight">
        {area.ja} 日本人におすすめ
      </h1>
      <p className="mt-2 text-sm text-muted">
        口コミ評価が高い順に表示しています。{entries.length}件の掲載店舗があります。
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.value];
          return (
            <Link
              key={c.value}
              href={`/coupons?category=${c.value}&area=${area.value}`}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              {c.ja}
            </Link>
          );
        })}
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {entries.length ? (
          entries.map(({ store, couponId, couponTitle }) => {
            const category = CATEGORIES.find((c) => c.value === store.category);
            const Icon = category ? CATEGORY_ICONS[category.value] : null;
            const rating = ratingByStore.get(store.id);
            return (
              <li key={store.id}>
                <Link
                  href={`/coupons/${couponId}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated"
                >
                  <span className="btn-glossy flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
                    {Icon && <Icon className="h-6 w-6" strokeWidth={2} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span>{category?.ja}</span>
                      {rating && (
                        <>
                          <span>・</span>
                          <span className="flex items-center gap-0.5 font-semibold text-foreground">
                            <Star className="h-3 w-3 text-primary" fill="currentColor" strokeWidth={0} />
                            {rating.avg.toFixed(1)}
                          </span>
                          <span>({rating.count})</span>
                        </>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="truncate font-medium">{store.name}</span>
                      {store.popular_with_japanese && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
                          <Flame className="h-2.5 w-2.5" />
                          日本人に人気
                        </span>
                      )}
                      {store.line_available && (
                        <span className="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          日本語対応
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold text-primary">{couponTitle}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <AreaIcon className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-2 text-sm text-muted">
              このエリアのクーポンは準備中です。
            </p>
            <Link
              href="/coupons"
              className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
            >
              他のエリア・カテゴリを見る
            </Link>
          </div>
        )}
      </ul>
    </main>
  );
}
