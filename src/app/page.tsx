import Link from "next/link";
import { ArrowRight, Search, Gift, Store, Languages, MapPin, Smartphone, Ticket } from "lucide-react";
import { auth, signOut } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES, AREA_IMAGES, HERO_IMAGE } from "@/lib/taxonomy-images";
import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";

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
      .gte("valid_to", new Date().toISOString().slice(0, 10))
      .order("created_at", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("coupons")
      .select("stores!inner(area)")
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
      <main className="relative overflow-hidden px-6 py-16 text-center">
        <div aria-hidden className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(20,16,14,0.45) 0%, rgba(20,16,14,0.82) 100%)" }}
          />
        </div>

        <div className="relative mx-auto flex max-w-sm flex-col items-center gap-5">
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            日本人旅行者限定
          </span>

          <h1 className="font-display text-balance text-4xl font-black leading-tight text-white">
            韓国旅行を、
            <br />
            もっとお得に。
          </h1>
          <p className="text-sm text-white/90">
            日本人旅行者向けの
            <br />
            韓国限定クーポンをかんたん検索。
          </p>
          <p className="text-xs leading-relaxed text-white/75">
            明洞・弘大・江南・聖水など、
            <br />
            人気エリアのグルメ・美容・ショッピングの
            <br />
            お得なクーポンが見つかります。
          </p>

          {session?.user ? (
            <div className="mt-1 flex flex-col items-center gap-3">
              <p className="text-sm text-white">
                ようこそ、<strong className="font-bold">{session.user.name}</strong>さん
              </p>
              <Link
                href="/coupons"
                className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card transition hover:brightness-105"
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
                <button className="text-xs text-white/80 underline underline-offset-4 transition hover:text-white">
                  ログアウト
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/coupons"
              className="group mt-1 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card transition hover:brightness-105"
            >
              無料でクーポンを探す
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          )}

          <p className="text-[11px] text-white/70">
            登録無料 ・ かんたん利用 ・ 韓国旅行ですぐ使える
          </p>
        </div>
      </main>

      {/* ---- 人気エリアから探す ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-xl font-black tracking-tight">人気エリアから探す</h2>
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(180deg, rgba(20,16,14,0) 45%, rgba(20,16,14,0.7) 100%)" }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-base font-bold text-white">{area.ja}</p>
                      {count > 0 && <p className="text-[11px] text-white/80">{count}件のクーポン</p>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-5 text-center">
            <Link href="/coupons" className="text-sm font-medium text-primary underline underline-offset-4">
              すべてのエリアを見る →
            </Link>
          </div>
        </div>
      </section>

      {/* ---- 今おすすめのクーポン ---- */}
      {recommended.length > 0 && (
        <section className="border-t border-border bg-card/40 px-6 py-14">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-xl font-black tracking-tight">今おすすめのクーポン</h2>
            <div className="mt-6 flex flex-col gap-3">
              {recommended.map((coupon) => {
                const category = CATEGORIES.find((c) => c.value === coupon.stores.category);
                const area = AREAS.find((a) => a.value === coupon.stores.area);
                const Icon = category ? CATEGORY_ICONS[category.value] : null;
                const discountRate =
                  coupon.regular_price && coupon.discounted_price
                    ? Math.round((1 - coupon.discounted_price / coupon.regular_price) * 100)
                    : null;
                return (
                  <Link
                    key={coupon.id}
                    href={`/coupons/${coupon.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {Icon && <Icon className="h-6 w-6" strokeWidth={2} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <span>{category?.ja}</span>
                        <span>・</span>
                        <span>{area?.ja}</span>
                      </span>
                      <span className="mt-0.5 block truncate font-medium">{coupon.stores.name}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="text-base font-bold text-primary">{coupon.title}</span>
                        {discountRate !== null && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {discountRate}%OFF
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---- クーポンの使い方 ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-center text-xl font-black tracking-tight">クーポンの使い方</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { n: "01", icon: Search, title: "クーポンを探す", desc: "行きたいエリアやカテゴリーからお気に入りのお店を見つけよう。" },
              { n: "02", icon: Gift, title: "無料でGET", desc: "会員登録して使いたいクーポンを保存。" },
              { n: "03", icon: Store, title: "お店で見せるだけ", desc: "韓国のお店でクーポン画面を提示してお得な特典を受けよう。" },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-border bg-card p-5 text-center shadow-card">
                <p className="font-display text-2xl font-black text-primary/30">{step.n}</p>
                <span className="mx-auto mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-bold">{step.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-muted">会員登録は無料。</p>
            <Link
              href="/coupons"
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card transition hover:brightness-105"
            >
              クーポンを探してみる
            </Link>
          </div>
        </div>
      </section>

      {/* ---- カテゴリーから探す ---- */}
      <section className="border-t border-border bg-card/40 px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-center text-xl font-black tracking-tight">カテゴリーから探す</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.value];
              return (
                <Link key={c.value} href={`/coupons?category=${c.value}`} className="group flex flex-col items-center gap-2">
                  <div className="relative w-full overflow-hidden rounded-2xl shadow-card transition-shadow duration-300 group-hover:shadow-elevated">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={CATEGORY_IMAGES[c.value]}
                      alt=""
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <span className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary">
                      <Icon className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                  </div>
                  <h3 className="text-[13px] font-bold leading-tight">{c.ja}</h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- K-Coupon Japanなら ---- */}
      <section className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-center text-xl font-black tracking-tight">
            K-Coupon Japanなら
            <br />
            韓国旅行がもっと便利に。
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.ja} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <b.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">{b.ja}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 中間CTA ---- */}
      <section className="relative overflow-hidden border-t border-border px-6 py-16 text-center">
        <div aria-hidden className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CATEGORY_IMAGES.tour} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(20,16,14,0.72)]" />
        </div>
        <div className="relative mx-auto flex max-w-sm flex-col items-center gap-3">
          <h2 className="font-display text-2xl font-black text-white">
            韓国旅行の前に
            <br />
            お得なクーポンをチェック。
          </h2>
          <p className="text-sm text-white/85">
            旅行前に保存しておけば、
            <br />
            韓国に着いてからすぐ使えます。
          </p>
          <Link
            href="/coupons"
            className="mt-2 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card transition hover:brightness-105"
          >
            <Ticket className="h-4 w-4" />
            無料でクーポンを探す
          </Link>
          <p className="text-[11px] text-white/70">登録無料</p>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section id="faq" className="border-t border-border px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-center text-xl font-black tracking-tight">よくある質問</h2>
          <div className="mt-6">
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </div>
      </section>
    </>
  );
}
