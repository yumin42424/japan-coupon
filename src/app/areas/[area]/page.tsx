import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AREAS, CATEGORIES, type AreaValue } from "@/lib/taxonomy";
import { CATEGORY_ICONS } from "@/lib/taxonomy-icons";
import { CouponCard } from "@/components/coupon-card";
import { EmptyState } from "@/components/empty-state";

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
      <p className="flex items-center gap-1 text-caption text-muted">
        <MapPin className="h-3.5 w-3.5" />
        エリアから探す
      </p>
      <h1 className="text-h1 font-display mt-1 tracking-tight">
        {area.ja} 日本人におすすめ
      </h1>
      <p className="mt-2 text-body text-muted">
        口コミ評価が高い順に表示しています。{entries.length}件の掲載店舗があります。
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.value];
          return (
            <Link
              key={c.value}
              href={`/coupons?category=${c.value}&area=${area.value}`}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-caption font-medium text-muted transition hover:border-primary/40 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              {c.ja}
            </Link>
          );
        })}
      </div>

      {entries.length ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map(({ store, couponId, couponTitle }) => (
            <CouponCard
              key={store.id}
              href={`/coupons/${couponId}`}
              category={store.category as (typeof CATEGORIES)[number]["value"]}
              storeName={store.name}
              benefit={couponTitle}
              popularWithJapanese={store.popular_with_japanese}
              rating={ratingByStore.get(store.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={MapPin}
            message="このエリアのクーポンは準備中です。"
            ctaLabel="他のエリア・カテゴリを見る"
            ctaHref="/coupons"
          />
        </div>
      )}
    </main>
  );
}
