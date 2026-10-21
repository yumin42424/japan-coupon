import { todayKST } from "@/lib/date";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";

// 광고 캠페인용 페이지라서 검색 결과에 따로 노출되지 않게 한다 (사이트맵에도 넣지 않는다).
export const metadata = { robots: { index: false, follow: true } };

type LandingPageRow = {
  slug: string;
  utm_source: string | null;
  target_category: string | null;
  target_area: string | null;
};

type CouponListItem = {
  id: string;
  title: string;
  discount_info: string | null;
  stores: { name: string; category: string; area: string } | null;
};

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: lp } = await supabaseAdmin
    .from("landing_pages")
    .select("slug, utm_source, target_category, target_area")
    .eq("slug", slug)
    .maybeSingle();

  if (!lp) notFound();
  const landing = lp as LandingPageRow;

  let couponQuery = supabaseAdmin
    .from("coupons")
    .select("id, title, discount_info, stores!inner(name, category, area)")
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .eq("is_demo", false)
    .eq("stores.is_demo", false)
    .gte("valid_to", todayKST())
    .order("created_at", { ascending: false })
    .limit(6);

  if (landing.target_category) couponQuery = couponQuery.eq("stores.category", landing.target_category);
  if (landing.target_area) couponQuery = couponQuery.eq("stores.area", landing.target_area);

  const { data } = await couponQuery;
  const coupons = (data ?? []) as unknown as CouponListItem[];

  const category = CATEGORIES.find((c) => c.value === landing.target_category);
  const area = AREAS.find((a) => a.value === landing.target_area);
  const Icon = category ? CATEGORY_ICONS[category.value] : null;

  const headlineJa = [category?.ja, area?.ja].filter(Boolean).join(" × ") || "韓国旅行";
  // 이 조건에 맞는 공개 쿠폰이 하나도 없을 때는 "今すぐGETできます" 같은 약속을 하지 않는다.
  const hasCoupons = coupons.length > 0;

  const signupHref = landing.utm_source
    ? `/signup?utm_source=${encodeURIComponent(landing.utm_source)}`
    : "/signup";

  return (
    <main className="relative overflow-hidden px-6 py-14 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]"
      />

      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
        {Icon && (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" strokeWidth={2} />
          </span>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight">
          {hasCoupons ? `${headlineJa}で使えるお得なクーポン` : `${headlineJa}のクーポンは準備中です`}
        </h1>
        <p className="text-sm text-muted">
          {hasCoupons
            ? "無料会員登録で、今すぐクーポンをGETできます。"
            : "提携店舗の準備ができ次第、順次公開します。公開までもうしばらくお待ちください。"}
        </p>
        <Link
          href={signupHref}
          className="btn-glossy group mt-2 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105"
        >
          {hasCoupons ? "無料でクーポンをGET" : "無料会員登録はこちら"}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative mx-auto mt-12 flex max-w-md flex-col gap-3">
        {coupons.map((coupon) => {
          const c = CATEGORIES.find((x) => x.value === coupon.stores?.category);
          const a = AREAS.find((x) => x.value === coupon.stores?.area);
          return (
            <div
              key={coupon.id}
              className="rounded-2xl border border-border bg-card p-4 text-left shadow-card"
            >
              <p className="flex items-center gap-1 text-xs text-muted">
                <span>
                  {c?.ja}
                </span>
                <span>・</span>
                <span className="flex items-center gap-0.5">
                  <AreaIcon className="h-3 w-3" />
                  {a?.ja}
                </span>
              </p>
              <p className="mt-1 font-medium">{coupon.stores?.name}</p>
              <p className="mt-1 text-lg font-bold text-primary">{coupon.title}</p>
              <p className="text-sm text-muted">{coupon.discount_info}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
