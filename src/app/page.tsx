import { todayKST } from "@/lib/date";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Ticket } from "lucide-react";
import { auth, signOut } from "@/auth";
import { ComingSoonNotice } from "@/components/coming-soon-notice";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_IMAGES, AREA_IMAGES } from "@/lib/taxonomy-images";
import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";
import { CouponCard } from "@/components/coupon-card";
import { SectionHeading } from "@/components/section-heading";
import { HeroImageCarousel } from "@/components/hero-image-carousel";

const FEATURED_AREA_VALUES = ["myeongdong", "hongdae", "gangnam", "seongsu"] as const;

const STEPS = [
  { title: "クーポンを探す", desc: "行きたいエリアやカテゴリーから、気になるお店を探します。" },
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

  const recommended = (couponRows ?? []) as unknown as RecommendedCoupon[];

  const areaCounts = new Map<string, number>();
  for (const row of (areaCouponRows ?? []) as unknown as { stores: { area: string } }[]) {
    const area = row.stores?.area;
    if (!area) continue;
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }

  const totalPublicCoupons = (areaCouponRows ?? []).length;

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
            style={{ background: "linear-gradient(180deg, rgba(20,16,14,0.45) 0%, rgba(20,16,14,0.82) 100%)" }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl py-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-24">
          <div className="relative flex flex-col items-center gap-5 text-center lg:items-start lg:gap-6 lg:text-left">
            <h1 className="text-display text-balance text-white lg:text-foreground">
              韓国旅行を、
              <br />
              もっとお得に。
            </h1>
            <p className="text-body-lg text-white/90 lg:text-foreground/80">
              日本人旅行者向けの
              <br className="lg:hidden" />
              韓国限定クーポンをかんたん検索。
            </p>
            {/* 公開中のクーポンがないときは、すぐ下の「準備中」のお知らせが説明するのでここでは繰り返さない */}
            {totalPublicCoupons > 0 && (
              <p className="text-body leading-relaxed text-white/75 lg:text-muted">
                明洞・弘大・江南・聖水など、人気エリアの
                <br className="lg:hidden" />
                グルメ・美容・ショッピングのお得なクーポンが見つかります。
              </p>
            )}

            {session?.user ? (
              <div className="mt-1 flex flex-col items-center gap-3 lg:items-start">
                <p className="text-body text-white lg:text-foreground">
                  ようこそ、<strong className="font-bold">{session.user.name}</strong>さん
                </p>
                <Link
                  href="/coupons"
                  className="group flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
                >
                  クーポンを探す
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="text-caption text-white/80 underline underline-offset-4 transition hover:text-muted lg:text-muted">
                    ログアウト
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
                <Link
                  href="/coupons"
                  className="group mt-1 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
                >
                  クーポンを探す
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/nearby"
                  className="mt-1 flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-body font-bold text-white transition hover:bg-white/10 lg:border-border lg:bg-card lg:text-foreground lg:hover:bg-background"
                >
                  <MapPin className="h-4 w-4" />
                  現在地から探す
                </Link>
              </div>
            )}

            <p className="text-caption text-white/70 lg:text-muted">登録無料 ・ 韓国旅行ですぐ使える</p>
          </div>

          {/* デスクトップのみ: 人気エリアの写真が数枚順番に切り替わる + 実データで作った小さなクーポンプレビュー */}
          <div className="relative mt-10 hidden lg:mt-0 lg:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <HeroImageCarousel
                images={featuredAreas.flatMap((a) => {
                  const src = AREA_IMAGES[a.value];
                  return src ? [{ src, label: a.ja as string }] : [];
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
          <div className="mx-auto max-w-5xl">
            <ComingSoonNotice loggedIn={!!session?.user} />
          </div>
        </section>
      )}

      {/* ---- 人気エリアから探す ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            title="人気エリアから探す"
            action={
              <Link href="/coupons" className="text-body font-medium text-primary underline underline-offset-4">
                すべてのエリア
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
                  <div className="relative aspect-[4/3] w-full">
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
                      <p className="text-h3 text-white">{area.ja}</p>
                      {count > 0 && <p className="text-caption text-white/80">{count}件のクーポン</p>}
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
          <div className="mx-auto max-w-5xl">
            <SectionHeading title="新着クーポン" />
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
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            title="クーポンの使い方"
            action={
              <Link href="/guide" className="text-body font-medium text-primary underline underline-offset-4">
                くわしく見る
              </Link>
            }
          />
          <ol className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-foreground/80 pt-4">
                <p className="text-h3">
                  <span className="mr-2 text-primary">{i + 1}</span>
                  {step.title}
                </p>
                <p className="mt-1.5 text-body text-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- カテゴリーから探す ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <SectionHeading title="カテゴリーから探す" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {CATEGORIES.map((c) => (
              <Link key={c.value} href={`/coupons?category=${c.value}`} className="group block">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                  <Image
                    src={CATEGORY_IMAGES[c.value]}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 22vw, 45vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="mt-2 text-body font-bold leading-tight">{c.ja}</h3>
              </Link>
            ))}
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
              韓国旅行の前に
              <br />
              お得なクーポンをチェック。
            </h2>
            <p className="text-body text-white/85">
              旅行前に保存しておけば、
              <br />
              韓国に着いてからすぐ使えます。
            </p>
            <Link
              href="/coupons"
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
            >
              <Ticket className="h-4 w-4" />
              クーポンを探す
            </Link>
          </div>
        </section>
      )}

      {/* ---- FAQ ---- */}
      <section id="faq" className="border-t border-border bg-background-alt px-6 py-14">
        <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <SectionHeading title="よくある質問" />
            <p className="mt-2 text-body text-muted">
              ここにない内容は、
              <Link href="/support" className="text-primary underline underline-offset-4">
                お問い合わせ
              </Link>
              からご連絡ください。
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </div>
      </section>
    </>
  );
}
