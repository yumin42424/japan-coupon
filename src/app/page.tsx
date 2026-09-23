import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, Gift, Store, Languages, MapPin, Smartphone, Ticket } from "lucide-react";
import { auth, signOut } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES, AREA_IMAGES } from "@/lib/taxonomy-images";
import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";
import { CouponCard } from "@/components/coupon-card";
import { SectionHeading } from "@/components/section-heading";

const FEATURED_AREA_VALUES = ["myeongdong", "hongdae", "gangnam", "seongsu"] as const;

const BENEFITS = [
  {
    icon: Languages,
    ja: "日本語でかんたん",
    desc: "クーポンの内容から利用方法まで日本語でチェック。",
  },
  {
    icon: MapPin,
    ja: "人気エリアから探せる",
    desc: "明洞・弘大・江南・聖水など旅行先からすぐ検索。",
  },
  {
    icon: Smartphone,
    ja: "旅行中すぐ使える",
    desc: "クーポンをGETして対象店舗で画面を見せるだけ。",
  },
  {
    icon: Gift,
    ja: "登録・利用無料",
    desc: "会員登録もクーポンの利用も無料です。",
  },
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
      .gte("valid_to", new Date().toISOString().slice(0, 10))
      .order("created_at", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("coupons")
      .select("stores!inner(area)")
      .eq("is_active", true)
      .eq("stores.is_active", true)
      .gte("valid_to", new Date().toISOString().slice(0, 10)),
  ]);

  const recommended = (couponRows ?? []) as unknown as RecommendedCoupon[];

  const areaCounts = new Map<string, number>();
  for (const row of (areaCouponRows ?? []) as unknown as { stores: { area: string } }[]) {
    const area = row.stores?.area;
    if (!area) continue;
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }

  const featuredAreas = FEATURED_AREA_VALUES.map((value) => AREAS.find((a) => a.value === value)).filter(
    (a): a is (typeof AREAS)[number] => !!a
  );

  return (
    <>
      {/* ---- Hero ---- */}
      <main className="relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6 py-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-10 lg:py-24">
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

          {/* テキストカラム */}
          <div className="relative flex flex-col items-center gap-5 text-center lg:items-start lg:gap-6 lg:text-left">
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-label font-medium text-white backdrop-blur-sm lg:border-primary/20 lg:bg-primary/10 lg:text-primary">
              日本人旅行者限定
            </span>

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
            <p className="text-body leading-relaxed text-white/75 lg:text-muted">
              明洞・弘大・江南・聖水など、人気エリアの
              <br className="lg:hidden" />
              グルメ・美容・ショッピングのお得なクーポンが見つかります。
            </p>

            {session?.user ? (
              <div className="mt-1 flex flex-col items-center gap-3 lg:items-start">
                <p className="text-body text-white lg:text-foreground">
                  ようこそ、<strong className="font-bold">{session.user.name}</strong>さん
                </p>
                <Link
                  href="/coupons"
                  className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-body font-bold text-primary-foreground shadow-card transition hover:brightness-105"
                >
                  無料でクーポンを探す
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
                  className="group mt-1 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-body font-bold text-primary-foreground shadow-card transition hover:brightness-105"
                >
                  無料でクーポンを探す
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/nearby"
                  className="mt-1 flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-body font-bold text-white backdrop-blur-sm transition hover:bg-white/10 lg:border-border lg:bg-card lg:text-foreground lg:hover:bg-background"
                >
                  <MapPin className="h-4 w-4" />
                  現在地から探す
                </Link>
              </div>
            )}

            <p className="text-caption text-white/70 lg:text-muted">
              登録無料 ・ かんたん利用 ・ 韓国旅行ですぐ使える
            </p>
          </div>

          {/* デスクトップのみ: 街の写真 + 実データで作った小さなクーポンプレビュー */}
          <div className="relative mt-10 hidden lg:mt-0 lg:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-elevated">
              <Image
                src={AREA_IMAGES.hongdae ?? ""}
                alt=""
                fill
                sizes="45vw"
                className="object-cover"
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

      {/* ---- 人気エリアから探す ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <SectionHeading title="人気エリアから探す" />
          <div className="mt-6 grid grid-cols-2 gap-4">
            {featuredAreas.map((area) => {
              const count = areaCounts.get(area.value) ?? 0;
              const image = AREA_IMAGES[area.value];
              return (
                <Link
                  key={area.value}
                  href={`/areas/${area.value}`}
                  className="group relative block overflow-hidden rounded-2xl shadow-card transition-shadow hover:shadow-elevated"
                >
                  <div className="relative aspect-[4/3] w-full">
                    {image && (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 672px) 320px, 45vw"
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
          <div className="mt-5 text-center">
            <Link href="/coupons" className="text-body font-medium text-primary underline underline-offset-4">
              すべてのエリアを見る →
            </Link>
          </div>
        </div>
      </section>

      {/* ---- 新着クーポン ---- */}
      {recommended.length > 0 && (
        <section className="border-t border-border bg-card/40 px-6 py-14">
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
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <SectionHeading title="クーポンの使い方" align="center" />
          <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
            {/* デスクトップで3ステップが一目で繋がって見えるように、カードの間を横線で結ぶ */}
            <div
              aria-hidden
              className="absolute inset-x-16 top-[3.25rem] hidden h-px bg-border sm:block"
            />
            {[
              { n: "01", icon: Search, title: "クーポンを探す", desc: "行きたいエリアやカテゴリーからお気に入りのお店を見つけよう。" },
              { n: "02", icon: Gift, title: "無料でGET", desc: "会員登録して使いたいクーポンを保存。" },
              { n: "03", icon: Store, title: "お店で見せるだけ", desc: "韓国のお店でクーポン画面を提示してお得な特典を受けよう。" },
            ].map((step) => (
              <div
                key={step.n}
                className="relative rounded-2xl border border-border bg-card p-5 text-center shadow-card"
              >
                <p className="font-display text-h1 text-primary/25">{step.n}</p>
                <span className="mx-auto -mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-h3">{step.title}</p>
                <p className="mt-1.5 text-caption leading-relaxed text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-body text-muted">会員登録は無料。</p>
            <Link
              href="/coupons"
              className="rounded-full bg-primary px-6 py-3 text-body font-bold text-primary-foreground shadow-card transition hover:brightness-105"
            >
              クーポンを探してみる
            </Link>
          </div>
        </div>
      </section>

      {/* ---- カテゴリーから探す ---- */}
      <section className="border-t border-border bg-card/40 px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <SectionHeading title="カテゴリーから探す" align="center" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.value];
              return (
                <Link key={c.value} href={`/coupons?category=${c.value}`} className="group flex flex-col items-center gap-2">
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-card transition-shadow duration-300 group-hover:shadow-elevated">
                    <Image
                      src={CATEGORY_IMAGES[c.value]}
                      alt=""
                      fill
                      sizes="(min-width: 672px) 160px, 45vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                      <Icon className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                  </div>
                  <h3 className="text-caption font-bold leading-tight">{c.ja}</h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- K-Coupon Japanなら ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <SectionHeading
            title="K-Coupon Japanなら韓国旅行がもっと便利に。"
            align="center"
          />
          <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2">
            {BENEFITS.map((b, i) => (
              <div key={b.ja} className="flex items-start gap-4">
                <span className="font-display text-h1 text-primary/25">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="border-l border-border pl-4">
                  <p className="text-h3">{b.ja}</p>
                  <p className="mt-1 text-caption leading-relaxed text-muted">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 中間CTA ---- */}
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
            className="mt-2 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-body font-bold text-primary-foreground shadow-card transition hover:brightness-105"
          >
            <Ticket className="h-4 w-4" />
            無料でクーポンを探す
          </Link>
          <p className="text-caption text-white/70">登録無料</p>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section id="faq" className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <SectionHeading title="よくある質問" align="center" />
          <div className="mt-6">
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </div>
      </section>
    </>
  );
}
