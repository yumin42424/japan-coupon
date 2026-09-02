import Link from "next/link";
import { ChevronRight, Lock, ChevronLeft, Flame, LocateFixed, Timer } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES } from "@/lib/taxonomy-images";
import { isUrgentDeadline } from "@/lib/urgency";

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
      <h1 className="text-2xl font-extrabold tracking-tight">
        クーポンを探す
      </h1>
      <p className="mt-2 text-sm text-muted">
        カテゴリまたはエリアを選んでください。
      </p>

      <Link
        href="/nearby"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/15"
      >
        <LocateFixed className="h-4 w-4" />
        現在地から探す
      </Link>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-muted">
          カテゴリから探す
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.value];
            return (
              <Link key={c.value} href={`/coupons?category=${c.value}`} className="group flex flex-col items-center gap-2">
                <div className="relative w-full overflow-hidden rounded-2xl border border-border shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={CATEGORY_IMAGES[c.value]}
                    alt=""
                    className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-card text-primary shadow">
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                </div>
                <h3 className="text-[15px] font-bold leading-tight">{c.ja}</h3>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-muted">
          エリアから探す
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {AREAS.map((a) => (
            <Link
              key={a.value}
              href={`/coupons?area=${a.value}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <AreaIcon className="h-5 w-5 text-primary" />
              <span className="text-center text-sm font-bold leading-tight">
                {a.ja}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/coupons?area=all"
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
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
  const session = await auth();
  const area = areaParam === "all" ? undefined : areaParam;

  let query = supabaseAdmin
    .from("coupons")
    .select(
      "id, title, discount_info, valid_to, member_only, stores!inner(id, name, category, area, line_available, popular_with_japanese)"
    )
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
        ? "border-primary bg-primary/10 text-primary"
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

      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
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

      <ul className="mt-8 flex flex-col gap-3">
        {coupons.length ? (
          coupons.map((coupon) => {
            const c = CATEGORIES.find((x) => x.value === coupon.stores.category);
            const a = AREAS.find((x) => x.value === coupon.stores.area);
            const Icon = c ? CATEGORY_ICONS[c.value] : null;
            const isLocked = coupon.member_only && !session?.user;
            return (
              <li key={coupon.id}>
                <Link
                  href={`/coupons/${coupon.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
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
                      {coupon.member_only && (
                        <span className="ml-1 flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                          <Lock className="h-2.5 w-2.5" />
                          会員限定
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="truncate font-medium">{coupon.stores.name}</span>
                      {coupon.stores.popular_with_japanese && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
                          <Flame className="h-2.5 w-2.5" />
                          日本人に人気
                        </span>
                      )}
                      {isUrgentDeadline(coupon.valid_to) && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          <Timer className="h-2.5 w-2.5" />
                          締切間近
                        </span>
                      )}
                    </span>
                    {isLocked ? (
                      <span className="mt-1 block text-sm font-medium text-muted">
                        会員登録で内容を表示
                      </span>
                    ) : (
                      <span className="mt-1 block text-lg font-bold text-primary">{coupon.title}</span>
                    )}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted">
              該当するクーポンがありません。
            </p>
          </div>
        )}
      </ul>
    </main>
  );
}
