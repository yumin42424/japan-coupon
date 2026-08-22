import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";
import { JaKo } from "@/components/ja-ko";

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
    .gte("valid_to", new Date().toISOString().slice(0, 10))
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
  const headlineKo = [category?.ko, area?.ko].filter(Boolean).join(" × ") || "한국여행";

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
          <JaKo ja={`${headlineJa}で使えるお得なクーポン`} ko={`${headlineKo}에서 쓸 수 있는 알뜰 쿠폰`} />
        </h1>
        <p className="text-sm text-muted">
          <JaKo
            ja="無料会員登録で、今すぐクーポンをGETできます。"
            ko="무료 회원가입하면 지금 바로 쿠폰을 받을 수 있어요."
          />
        </p>
        <Link
          href={signupHref}
          className="group mt-2 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
        >
          <JaKo ja="無料でクーポンをGET" ko="무료로 쿠폰 받기" />
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
              className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm"
            >
              <p className="flex items-center gap-1 text-xs text-muted">
                <span>
                  {c?.ja}({c?.ko})
                </span>
                <span>・</span>
                <span className="flex items-center gap-0.5">
                  <AreaIcon className="h-3 w-3" />
                  {a?.ja}({a?.ko})
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
