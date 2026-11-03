import { todayKST } from "@/lib/date";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { ChevronLeft, LocateFixed, Search } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ComingSoonNotice } from "@/components/coming-soon-notice";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS } from "@/lib/taxonomy-icons";
import { CategoryGrid } from "@/components/category-grid";
import { isUrgentDeadline, daysUntil } from "@/lib/urgency";
import {
  COUPON_SORTS,
  couponListHref,
  pageRange,
  parseCouponListParams,
  sanitizeKeyword,
  totalPages,
  type RawCouponListParams,
} from "@/lib/coupon-list";
import { CouponCard } from "@/components/coupon-card";
import { EmptyState } from "@/components/empty-state";
import { CouponCardSkeleton } from "@/components/coupon-card-skeleton";

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
  quantity_limit: number | null;
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
  searchParams: Promise<RawCouponListParams>;
}) {
  const raw = await searchParams;
  const hasFilter = !!(raw.category || raw.area || raw.q?.trim());

  // 카테고리/지역을 아직 고르지 않았으면 먼저 큰 타일로 골라 들어가게 하고,
  // 하나라도 고른 뒤에는 실제 쿠폰 목록 화면을 보여준다.
  if (!hasFilter) {
    return <CategoryAreaHub />;
  }

  // ここだけ Suspense で囲む — segment 全体の loading.tsx にすると
  // /coupons/[id] まで同じ境界に入ってしまい、notFound() の 404 が
  // ストリーミング開始後の 200 で固定されてしまう不具合があった。
  return (
    <Suspense fallback={<FilteredCouponListFallback />}>
      <FilteredCouponList raw={raw} />
    </Suspense>
  );
}

function FilteredCouponListFallback() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="h-7 w-40 animate-pulse rounded bg-border/60" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CouponCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}

async function CategoryAreaHub() {
  // 공개된 쿠폰이 하나도 없으면(제휴 매장 확보 전) 빈 목록 대신 "準備中" 안내를 먼저 보여준다.
  const [{ count: publicCouponCount }, session] = await Promise.all([
    supabaseAdmin
      .from("coupons")
      .select("id, stores!inner(id)", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_demo", false)
      .eq("stores.is_active", true)
      .eq("stores.is_demo", false)
      .gte("valid_to", todayKST()),
    auth(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">
        クーポンを探す
      </h1>
      <p className="mt-2 text-body text-muted">
        カテゴリまたはエリアを選んでください。
      </p>

      <form action="/coupons" className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          name="q"
          placeholder="店舗名やクーポン名で検索"
          className="w-full rounded-lg border border-border bg-card py-3 pl-11 pr-4 text-body outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </form>

      {(publicCouponCount ?? 0) === 0 && (
        <div className="mt-6">
          <ComingSoonNotice loggedIn={!!session?.user} />
        </div>
      )}

      <Link
        href="/nearby"
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-body font-medium transition hover:bg-background"
      >
        <LocateFixed className="h-4 w-4" />
        現在地から探す
      </Link>

      <section className="mt-8">
        <h2 className="text-h3">カテゴリから探す</h2>
        <div className="mt-3">
          <CategoryGrid />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-h3">エリアから探す</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {AREAS.map((a) => (
            <Link
              key={a.value}
              href={`/areas/${a.value}`}
              className="rounded-lg border border-border bg-card px-3 py-3 text-center text-body font-bold transition hover:border-foreground/30"
            >
              {a.ja}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/coupons?area=all"
          className="inline-block py-2 text-body text-muted underline underline-offset-4 hover:text-foreground"
        >
          すべてのクーポンを見る
        </Link>
      </div>
    </main>
  );
}

async function FilteredCouponList({ raw }: { raw: RawCouponListParams }) {
  // 주소 파라미터는 허용된 값만 통과시킨다 (없는 카테고리·지역·이상한 페이지 번호는 "조건 없음"으로 취급).
  const { category, area, q: keyword, sort, page } = parseCouponListParams(raw);
  const safeKeyword = sanitizeKeyword(keyword);
  const { from, to } = pageRange(page);

  let query = supabaseAdmin
    .from("coupons")
    .select(
      "id, title, discount_info, valid_to, member_only, quantity_limit, stores!inner(id, name, category, area, line_available, popular_with_japanese)",
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .eq("is_demo", false)
    .eq("stores.is_demo", false)
    .gte("valid_to", todayKST());

  query =
    sort === "ending"
      ? query.order("valid_to", { ascending: true }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  if (category) query = query.eq("stores.category", category);
  if (area) query = query.eq("stores.area", area);

  if (keyword && !safeKeyword) {
    // 기호만 입력된 경우 — 아무것도 일치하지 않는 것으로 처리한다.
    query = query.eq("id", "00000000-0000-0000-0000-000000000000");
  } else if (safeKeyword) {
    // 매장명으로도 찾을 수 있어야 하는데, PostgREST의 OR 조건은 같은 테이블
    // 컬럼끼리만 안전하게 묶이므로 매장명 검색은 먼저 store_id 목록으로 변환한다.
    const { data: matchedStores } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("is_active", true)
      .eq("is_demo", false)
      .ilike("name", `%${safeKeyword}%`);
    const storeIds = (matchedStores ?? []).map((s) => s.id);
    const orParts = [`title.ilike.%${safeKeyword}%`];
    if (storeIds.length > 0) orParts.push(`store_id.in.(${storeIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const { data, count, error } = await query.range(from, to);

  const hrefFor = (next: { category?: string; area?: string; sort?: typeof sort; page?: number }) =>
    couponListHref({ category, area, q: keyword, sort, ...next });

  // 결과보다 뒤쪽의 페이지(예: 쿠폰이 줄어든 뒤의 옛 주소, 손으로 고친 page=9999)를 요청하면 PostgREST가
  // "범위 초과(PGRST103)"를 돌려준다. 이것은 장애가 아니므로 오류 화면·알림 없이 첫 페이지로 보낸다.
  if (error?.code === "PGRST103" && page > 1) redirect(hrefFor({ page: 1 }));

  // 조회에 실패했는데 "該当するクーポンがありません"라고 보여주면 거짓 안내가 된다 — 오류는 오류로 알린다.
  if (error) {
    Sentry.captureException(new Error(`coupon list query failed (${error.code ?? "no-code"})`));
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-h1 font-display tracking-tight">クーポンを探す</h1>
        <div className="mt-8">
          <EmptyState
            message="クーポンを読み込めませんでした。時間をおいてもう一度お試しください。"
            ctaLabel="もう一度読み込む"
            ctaHref={hrefFor({ page })}
          />
        </div>
      </main>
    );
  }

  const total = count ?? 0;
  const pages = totalPages(total);
  // 존재하지 않는 뒤쪽 페이지(예: 쿠폰이 줄어든 뒤의 즐겨찾기 주소)는 마지막 페이지로 보낸다.
  if (page > pages) redirect(hrefFor({ page: pages }));

  const coupons = (data ?? []) as unknown as CouponListItem[];

  // 수량 제한이 있는 쿠폰은 목록 카드에도 남은 수량을 보여준다 (발급 수는 발급 기록에서 센다).
  const limitedIds = coupons.filter((c) => c.quantity_limit != null).map((c) => c.id);
  const issuedCount = new Map<string, number>();
  if (limitedIds.length > 0) {
    const { data: issued } = await supabaseAdmin
      .from("coupon_events")
      .select("coupon_id")
      .eq("event_type", "issue")
      .in("coupon_id", limitedIds);
    for (const row of issued ?? []) issuedCount.set(row.coupon_id, (issuedCount.get(row.coupon_id) ?? 0) + 1);
  }

  const chip = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "btn-glossy border-transparent text-primary-foreground"
        : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
    }`;

  const currentCategory = CATEGORIES.find((c) => c.value === category);
  const currentArea = AREAS.find((a) => a.value === area);
  const pagerLink =
    "rounded-lg border border-border px-4 py-2 text-body font-medium text-foreground transition hover:border-foreground/30";
  const pagerOff = "rounded-lg border border-border px-4 py-2 text-body font-medium text-muted opacity-40";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/coupons"
        className="-my-2 inline-flex items-center gap-1 py-2 text-body text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        カテゴリ・エリア選択に戻る
      </Link>

      <h1 className="text-h1 font-display mt-3 tracking-tight">
        {keyword ? `「${keyword}」の検索結果` : null}
        {!keyword && currentCategory ? currentCategory.ja : null}
        {!keyword && currentCategory && currentArea ? " ・ " : null}
        {!keyword && currentArea ? currentArea.ja : null}
        {!keyword && !currentCategory && !currentArea && "すべてのクーポン"}
      </h1>
      {total > 0 && <p className="mt-1 text-caption text-muted">{total}件</p>}

      <form action="/coupons" className="relative mt-4">
        {category && <input type="hidden" name="category" value={category} />}
        {area && <input type="hidden" name="area" value={area} />}
        {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          name="q"
          defaultValue={keyword}
          placeholder="店舗名やクーポン名で検索"
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-11 pr-4 text-body outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </form>

      {/* モバイルでは横スクロールの1行にして、絞り込みで画面が埋まりクーポンが下に押し出されないようにする */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0" role="group" aria-label="カテゴリ">
        <Link href={hrefFor({ category: undefined, page: 1 })} className={chip(!category)}>
          すべて
        </Link>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.value];
          return (
            <Link
              key={c.value}
              href={hrefFor({ category: c.value, page: 1 })}
              className={chip(category === c.value)}
              aria-current={category === c.value ? "true" : undefined}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              {c.ja}
            </Link>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0" role="group" aria-label="エリア">
        <Link href={hrefFor({ area: undefined, page: 1 })} className={chip(!area)}>
          全エリア
        </Link>
        {AREAS.map((a) => (
          <Link
            key={a.value}
            href={hrefFor({ area: a.value, page: 1 })}
            className={chip(area === a.value)}
            aria-current={area === a.value ? "true" : undefined}
          >
            {a.ja}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="並び替え">
        <span className="text-caption text-muted">並び替え</span>
        {COUPON_SORTS.map((s) => (
          <Link key={s.value} href={hrefFor({ sort: s.value, page: 1 })} className={chip(sort === s.value)} aria-current={sort === s.value ? "true" : undefined}>
            {s.ja}
          </Link>
        ))}
      </div>

      {coupons.length ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {coupons.map((coupon) => {
            const remaining =
              coupon.quantity_limit != null
                ? Math.max(0, coupon.quantity_limit - (issuedCount.get(coupon.id) ?? 0))
                : null;
            return (
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
                stock={remaining !== null ? { remaining } : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          {/* 絞り込みなしで0件 = まだ公開中のクーポンがない。絞り込みありで0件 = 条件に合うものがない。言い分ける */}
          {category || area || keyword ? (
            <EmptyState
              message="条件に合うクーポンがありません。"
              ctaLabel="すべてのクーポンを見る"
              ctaHref={couponListHref({})}
            />
          ) : (
            <EmptyState
              message="クーポンは現在準備中です。提携店舗の準備ができ次第、順次公開します。"
              ctaLabel="ご利用ガイドを見る"
              ctaHref="/guide"
            />
          )}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="ページ送り" className="mt-10 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link href={hrefFor({ page: page - 1 })} rel="prev" className={pagerLink}>
              前へ
            </Link>
          ) : (
            <span className={pagerOff} aria-disabled="true">
              前へ
            </span>
          )}
          <span className="text-body text-muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={hrefFor({ page: page + 1 })} rel="next" className={pagerLink}>
              次へ
            </Link>
          ) : (
            <span className={pagerOff} aria-disabled="true">
              次へ
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
