import { todayKST } from "@/lib/date";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Search, Ticket } from "lucide-react";
import { auth } from "@/auth";
import { ComingSoonNotice } from "@/components/coming-soon-notice";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_IMAGES, AREA_IMAGES } from "@/lib/taxonomy-images";
import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";
import { CouponCard } from "@/components/coupon-card";
import { SectionHeading } from "@/components/section-heading";
import { HeroImageCarousel } from "@/components/hero-image-carousel";
import { CategoryGrid } from "@/components/category-grid";
import { getT } from "@/i18n/server";
import { translateRows } from "@/i18n/content";
import { COUPON_TEXT } from "@/i18n/content-fields";

const FEATURED_AREA_VALUES = ["myeongdong", "hongdae", "gangnam", "seongsu"] as const;
// ヒーローの「人気エリア」ショートカット（ソウル中心＋釜山・済州）
const HERO_AREA_VALUES = ["myeongdong", "hongdae", "gangnam", "seongsu", "dongdaemun", "busan", "jeju"] as const;

const STEPS = [
  { title: "クーポンを探す", desc: "行きたいエリアやカテゴリから、気になるお店を探します。" },
  { title: "無料でGET", desc: "会員登録をして、使いたいクーポンを保存します。" },
  { title: "お店で見せる", desc: "韓国のお店でクーポン画面を見せると、特典を受けられます。" },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "K-Coupon Japanは無料ですか？",
    a: "はい。会員登録およびクーポンの利用は無料です。",
  },
  {
    q: "クーポンはどうやって使いますか？",
    a: "利用したいクーポンをGETし、対象店舗でクーポン画面をご提示ください。クーポンによって利用方法が異なる場合がありますので、詳細ページの利用条件をご確認ください。",
  },
  {
    q: "韓国に着いてからでも登録できますか？",
    a: "はい。日本からでも韓国滞在中でもご登録いただけます。",
  },
  {
    q: "他の割引と一緒に使えますか？",
    a: "クーポンによって異なります。各クーポンの利用条件をご確認ください。",
  },
  {
    q: "予約は必要ですか？",
    a: "店舗・サービスによって異なります。「予約必須」と表示されているクーポンについては、事前にご予約ください。",
  },
];

type RecommendedCoupon = {
  id: string;
  title: string;
  discount_info: string | null;
  valid_to: string;
  regular_price: number | null;
  discounted_price: number | null;
  stores: {
    name: string;
    category: string;
    area: string;
  };
};

export default async function Home() {
  const t = await getT();
  const session = await auth();

  const [{ data: couponRows }, { data: areaCouponRows }] = await Promise.all([
    supabaseAdmin
      .from("coupons")
      .select(
        "id, title, discount_info, valid_to, regular_price, discounted_price, stores!inner(name, category, area)"
      )
      .eq("is_active", true)
      .eq("stores.is_active", true)
      .eq("is_demo", false)
      .eq("stores.is_demo", false)
      .gte("valid_to", todayKST())
      .order("created_at", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("coupons")
      .select("stores!inner(area)")
      .eq("is_active", true)
      .eq("stores.is_active", true)
      .eq("is_demo", false)
      .eq("stores.is_demo", false)
      .gte("valid_to", todayKST()),
  ]);

  const recommended = await translateRows((couponRows ?? []) as unknown as RecommendedCoupon[], COUPON_TEXT);

  const areaCounts = new Map<string, number>();
  for (const row of (areaCouponRows ?? []) as unknown as { stores: { area: string } }[]) {
    const area = row.stores?.area;
    if (!area) continue;
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }

  const totalPublicCoupons = (areaCouponRows ?? []).length;

  const heroLines = t("韓国旅行の|クーポンを、|日本語で。").split("|");

  const featuredAreas = FEATURED_AREA_VALUES.map((value) => AREAS.find((a) => a.value === value)).filter(
    (a): a is (typeof AREAS)[number] => !!a
  );

  return (
    <>
      {/* ---- Hero ---- */}
      <main className="relative overflow-hidden px-6">
        {/* モバイルのみ: 背景写真+暗めのオーバーレイ。デスクトップは右カラムに独立した写真を置くのでここでは使わない */}
        <div aria-hidden className="absolute inset-0 lg:hidden">
          <Image
            src={AREA_IMAGES.myeongdong ?? ""}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(20,16,14,0.5) 0%, rgba(20,16,14,0.86) 100%)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl pb-12 pt-16 sm:py-14 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-16">
          <div className="relative flex flex-col items-start gap-4 lg:gap-5">
            <p className="text-caption font-bold tracking-wide text-white/80 lg:text-primary">
              {t("ソウル・釜山・済州の旅行に")}
            </p>
            {/* 何のサービスかが一目で伝わる見出し — 「韓国旅行」「クーポン」「日本語」の3点。
                改行位置は固定する: 見出しフォントの読み込み前後で折り返しが変わると、下の内容がずれる(CLS)。 */}
            <h1 className="text-display text-white lg:text-foreground">
              {heroLines[0]}
              <br className="sm:hidden lg:inline xl:hidden" />
              {heroLines[1]}
              <br />
              {heroLines[2]}
            </h1>
            <p className="max-w-md text-body-lg text-white/90 lg:text-foreground/80">
              {t("韓国のお店のクーポンを日本語で探して、店頭で画面を見せるだけ。日本人旅行者のためのクーポンサイトです。")}
            </p>
            {/* 公開中のクーポンがないときは、すぐ下の「準備中」のお知らせが説明するのでここでは繰り返さない */}
            {totalPublicCoupons > 0 && (
              <p className="text-body leading-relaxed text-white/75 lg:text-muted">
                {t("明洞・弘大・江南・聖水など、人気エリアのグルメ・美容・ショッピングのお得なクーポンが見つかります。")}
              </p>
            )}

            {/* ヒーローの主な動作は「探す」— クーポン検索(既存の /coupons?q= をそのまま使う) */}
            <form
              action="/coupons"
              role="search"
              className="mt-1 flex w-full max-w-lg overflow-hidden rounded-lg border border-white/20 bg-white lg:border-border"
            >
              <label htmlFor="hero-search" className="sr-only">
                {t("クーポンを検索")}
              </label>
              <Search className="ml-4 h-5 w-5 shrink-0 self-center text-muted" aria-hidden="true" />
              <input
                id="hero-search"
                type="search"
                name="q"
                maxLength={50}
                placeholder={t("店舗名・クーポン名で検索")}
                className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-body text-foreground outline-none placeholder:text-muted"
              />
              <button type="submit" className="btn-glossy shrink-0 px-5 text-body font-bold text-primary-foreground sm:px-6">
                {t("検索")}
              </button>
            </form>

            <div className="flex w-full max-w-lg flex-wrap items-center gap-x-1 gap-y-0.5">
              <span className="mr-1.5 text-caption font-bold text-white/75 lg:text-muted">{t("人気エリア")}</span>
              {HERO_AREA_VALUES.map((value) => {
                const area = AREAS.find((a) => a.value === value);
                if (!area) return null;
                return (
                  <Link
                    key={value}
                    href={`/areas/${value}`}
                    className="rounded-lg px-2 py-1.5 text-body font-medium text-white underline-offset-4 transition-colors hover:underline lg:text-foreground lg:hover:text-primary"
                  >
                    {t(area.ja)}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <Link
                href="/nearby"
                className="group inline-flex items-center gap-1.5 py-1.5 text-body font-bold text-white lg:text-foreground"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span className="underline-offset-4 group-hover:underline">{t("現在地から探す")}</span>
              </Link>
              <Link
                href="/coupons"
                className="group inline-flex items-center gap-1 py-1.5 text-body font-bold text-white lg:text-primary"
              >
                <span className="underline-offset-4 group-hover:underline">{t("カテゴリから探す")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            {!session?.user && (
              <p className="text-caption text-white/75 lg:text-muted">{t("会員登録・ご利用は無料です")}</p>
            )}
          </div>

          {/* デスクトップのみ: 人気エリアの写真が数枚順番に切り替わる + 実データで作った小さなクーポンプレビュー */}
          <div className="relative mt-10 hidden lg:mt-0 lg:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <HeroImageCarousel
                images={featuredAreas.flatMap((a) => {
                  const src = AREA_IMAGES[a.value];
                  return src ? [{ src, label: t(a.ja) }] : [];
                })}
              />
            </div>
            {recommended[0] && (
              <div className="absolute -bottom-8 -left-8 w-72">
                <CouponCard
                  href={`/coupons/${recommended[0].id}`}
                  category={recommended[0].stores.category as (typeof CATEGORIES)[number]["value"]}
                  area={recommended[0].stores.area as (typeof AREAS)[number]["value"]}
                  storeName={recommended[0].stores.name}
                  benefit={recommended[0].title}
                  discountRate={
                    recommended[0].regular_price && recommended[0].discounted_price
                      ? Math.round(
                          (1 - recommended[0].discounted_price / recommended[0].regular_price) * 100
                        )
                      : null
                  }
                  className="shadow-elevated"
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ---- 準備中のお知らせ (公開クーポンが0件のときだけ) ---- */}
      {totalPublicCoupons === 0 && (
        <section className="border-t border-border bg-background-alt px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <ComingSoonNotice loggedIn={!!session?.user} />
          </div>
        </section>
      )}

      {/* ---- 人気エリアから探す ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title={t("人気エリアから探す")}
            action={
              <Link href="/coupons" className="-my-1 py-2 text-body font-medium text-primary underline underline-offset-4">
                {t("すべてのエリア")}
              </Link>
            }
          />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featuredAreas.map((area) => {
              const count = areaCounts.get(area.value) ?? 0;
              const image = AREA_IMAGES[area.value];
              return (
                <Link
                  key={area.value}
                  href={`/areas/${area.value}`}
                  className="group relative block overflow-hidden rounded-xl"
                >
                  <div className="relative aspect-[4/3] w-full bg-background-alt">
                    {image && (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 240px, 45vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(180deg, rgba(20,16,14,0) 45%, rgba(20,16,14,0.7) 100%)" }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-h3 text-white">{t(area.ja)}</p>
                      {count > 0 && <p className="text-caption text-white/80">{t("{n}件のクーポン", { n: count })}</p>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- 新着クーポン ---- */}
      {recommended.length > 0 && (
        <section className="border-t border-border bg-background-alt px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <SectionHeading title={t("新着クーポン")} />
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recommended.map((coupon) => {
                const discountRate =
                  coupon.regular_price && coupon.discounted_price
                    ? Math.round((1 - coupon.discounted_price / coupon.regular_price) * 100)
                    : null;
                return (
                  <CouponCard
                    key={coupon.id}
                    href={`/coupons/${coupon.id}`}
                    category={coupon.stores.category as (typeof CATEGORIES)[number]["value"]}
                    area={coupon.stores.area as (typeof AREAS)[number]["value"]}
                    storeName={coupon.stores.name}
                    benefit={coupon.title}
                    discountRate={discountRate}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---- クーポンの使い方 ---- */}
      <section className="border-t border-border bg-background-alt px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title={t("クーポンの使い方")}
            action={
              <Link href="/guide" className="-my-1 py-2 text-body font-medium text-primary underline underline-offset-4">
                {t("くわしく見る")}
              </Link>
            }
          />
          <ol className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <li key={t(step.title)} className="border-t border-foreground/80 pt-4">
                <p className="text-h3">
                  <span className="mr-2 text-primary">{i + 1}</span>
                  {t(step.title)}
                </p>
                <p className="mt-1.5 text-body text-muted">{t(step.desc)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- カテゴリから探す ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionHeading title={t("カテゴリから探す")} />
          <div className="mt-6">
            <CategoryGrid />
          </div>
        </div>
      </section>

      {/* ---- 中間CTA (公開中のクーポンがあるときだけ。ないときは上の準備中のお知らせに任せ、同じ文言を繰り返さない) ---- */}
      {totalPublicCoupons > 0 && (
        <section className="relative overflow-hidden border-t border-border px-6 py-16 text-center">
          <div aria-hidden className="absolute inset-0">
            <Image src={CATEGORY_IMAGES.tour} alt="" fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-[rgba(20,16,14,0.72)]" />
          </div>
          <div className="relative mx-auto flex max-w-sm flex-col items-center gap-3">
            <h2 className="text-h1 text-white">
              {t("韓国旅行の前に")}
              <br />
              {t("お得なクーポンをチェック。")}
            </h2>
            <p className="text-body text-white/85">
              {t("旅行前に保存しておけば、")}
              <br />
              {t("韓国に着いてからすぐ使えます。")}
            </p>
            <Link
              href="/coupons"
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
            >
              <Ticket className="h-4 w-4" />
              {t("クーポンを探す")}
            </Link>
          </div>
        </section>
      )}

      {/* ---- FAQ ---- */}
      <section id="faq" className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <SectionHeading title={t("よくある質問")} />
            <p className="mt-2 text-body text-muted">
              {t("ここにない内容は、")}
              <Link href="/support" className="text-primary underline underline-offset-4">
                {t("お問い合わせ")}
              </Link>
              {t("からご連絡ください。")}
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <FaqAccordion items={FAQ_ITEMS.map((item) => ({ q: t(item.q), a: t(item.a) }))} />
          </div>
        </div>
      </section>
    </>
  );
}
