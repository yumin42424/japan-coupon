import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, LocateFixed } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES } from "@/lib/taxonomy-images";
import { isUrgentDeadline, daysUntil } from "@/lib/urgency";
import { CouponCard } from "@/components/coupon-card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "クーポンを探す",
  description:
    "明洞・弘大・江南・聖水など韓国の人気エリア、グルメ・美容・ショッピングなどのカテゴリからクーポンを検索できます。",
};

type CouponListItem = {
  id: string;
  title: string;
  discount_info: string | null;
  valid_to: string;
  member_only: boolean;
  stores: {
    id: string;
    name: string;
    category: string;
    area: string;
    line_available: boolean;
    popular_with_japanese: boolean;
  };
};

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; area?: string }>;
}) {
  const { category, area } = await searchParams;
  const hasFilter = !!(category || area);

  // 카테고리/지역을 아직 고르지 않았으면 먼저 큰 타일로 골라 들어가게 하고,
  // 하나라도 고른 뒤에는 실제 쿠폰 목록 화면을 보여준다.
  if (!hasFilter) {
    return <CategoryAreaHub />;
  }

  return <FilteredCouponList category={category} area={area} />;
}

function CategoryAreaHub() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">
        クーポンを探す
      </h1>
      <p className="mt-2 text-body text-muted">
        カテゴリまたはエリアを選んでください。
      </p>

      <Link
        href="/nearby"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-body font-bold text-primary shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <LocateFixed className="h-4 w-4" />
        現在地から探す
      </Link>

      <section className="mt-8">
        <h2 className="text-label font-bold uppercase tracking-wider text-muted">
          カテゴリから探す
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.value];
            return (
              <Link
                key={c.value}
                href={`/coupons?category=${c.value}`}
                className="group relative block w-full overflow-hidden rounded-2xl shadow-card transition-shadow duration-300 hover:shadow-elevated"
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={CATEGORY_IMAGES[c.value]}
                    alt=""
                    fill
                    sizes="(min-width: 672px) 160px, 45vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(180deg, rgba(20,16,14,0) 50%, rgba(20,16,14,0.65) 100%)" }}
                  />
                  <span className="absolute left-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <h3 className="absolute inset-x-0 bottom-2.5 px-2.5 text-h3 leading-tight text-white">
                    {c.ja}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-label font-bold uppercase tracking-wider text-muted">
          エリアから探す
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {AREAS.map((a) => (
            <Link
              key={a.value}
              href={`/areas/${a.value}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated"
            >
              <span className="btn-glossy flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground">
                <AreaIcon className="h-4 w-4" />
              </span>
              <span className="text-center text-caption font-bold leading-tight">
                {a.ja}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/coupons?area=all"
          className="text-body text-muted underline underline-offset-4 hover:text-foreground"
        >
          すべてのクーポンを見る
        </Link>
      </div>
    </main>
  );
}

async function FilteredCouponList({
  category,
  area: areaParam,
}: {
  category?: string;
  area?: string;
}) {
  const area = areaParam === "all" ? undefined : areaParam;

  let query = supabaseAdmin
    .from("coupons")
    .select(
      "id, title, discount_info, valid_to, member_only, stores!inner(id, name, category, area, line_available, popular_with_japanese)"
    )
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .gte("valid_to", new Date().toISOString().slice(0, 10))
    .order("created_at", { ascending: false });

  if (category) query = query.eq("stores.category", category);
  if (area) query = query.eq("stores.area", area);

  const { data } = await query;
  const coupons = (data ?? []) as unknown as CouponListItem[];

  const buildHref = (next: { category?: string; area?: string }) => {
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.area) params.set("area", next.area);
    const qs = params.toString();
    return qs ? `/coupons?${qs}` : "/coupons";
  };

  const chip = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "btn-glossy border-transparent text-primary-foreground"
        : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
    }`;

  const currentCategory = CATEGORIES.find((c) => c.value === category);
  const currentArea = AREAS.find((a) => a.value === area);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/coupons"
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        カテゴリ・エリア選択に戻る
      </Link>

      <h1 className="text-h1 font-display mt-3 tracking-tight">
        {currentCategory ? currentCategory.ja : null}
        {currentCategory && currentArea ? " ・ " : null}
        {currentArea ? currentArea.ja : null}
        {!currentCategory && !currentArea && "すべてのクーポン"}
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={buildHref({ area })} className={chip(!category)}>
          すべて
        </Link>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.value];
          return (
            <Link
              key={c.value}
              href={buildHref({ category: c.value, area })}
              className={chip(category === c.value)}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              {c.ja}
            </Link>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Link href={buildHref({ category })} className={chip(!area)}>
          全エリア
        </Link>
        {AREAS.map((a) => (
          <Link
            key={a.value}
            href={buildHref({ category, area: a.value })}
            className={chip(area === a.value)}
          >
            <AreaIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {a.ja}
          </Link>
        ))}
      </div>

      {coupons.length ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              href={`/coupons/${coupon.id}`}
              category={coupon.stores.category as (typeof CATEGORIES)[number]["value"]}
              area={coupon.stores.area as (typeof AREAS)[number]["value"]}
              storeName={coupon.stores.name}
              benefit={coupon.title}
              memberOnly={coupon.member_only}
              popularWithJapanese={coupon.stores.popular_with_japanese}
              urgent={isUrgentDeadline(coupon.valid_to)}
              daysLeft={daysUntil(coupon.valid_to)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState message="該当するクーポンがありません。" ctaLabel="すべてのクーポンを見る" ctaHref="/coupons" />
        </div>
      )}
    </main>
  );
}
