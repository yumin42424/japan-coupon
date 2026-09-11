import Link from "next/link";
import { ArrowRight, Sparkles, Ticket, MapPin, Store, Bell, Percent, Star, ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/auth";
import { CATEGORIES } from "@/lib/taxonomy";
import { CATEGORY_ICONS } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES, HERO_IMAGE } from "@/lib/taxonomy-images";
import { TiltCard } from "@/components/tilt-card";

const BENEFITS = [
  {
    icon: Ticket,
    ja: "会員限定クーポン",
    ko: "회원 전용 쿠폰",
  },
  {
    icon: Store,
    ja: "人気店のお得情報",
    ko: "인기 매장 정보",
  },
  {
    icon: Percent,
    ja: "韓国旅行のお得情報",
    ko: "여행 알뜰 정보",
  },
  {
    icon: Bell,
    ja: "新着クーポンをGET",
    ko: "신규 쿠폰 알림",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <>
      <main className="relative flex flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-16 text-center">
        <div aria-hidden className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMAGE} alt="" className="h-full w-full scale-105 object-cover" />
          {/* 사진 위 텍스트 가독성용 스크림 + 브랜드 컬러 그라데이션 메쉬로 색감 입체감 추가 */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(20,16,14,0.5) 0%, rgba(20,16,14,0.88) 100%)",
            }}
          />
          <div aria-hidden className="grain-mesh absolute inset-0 opacity-70 mix-blend-plus-lighter" />
        </div>

        <div className="relative flex max-w-sm flex-col items-center gap-6">
          <span className="surface-glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" />
            日本人旅行者限定
          </span>

          <h1 className="font-display text-balance text-5xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
            K-Coupon <span className="text-primary">Japan</span>
          </h1>
          <p className="-mt-2 text-base font-medium text-white/90">
            韓国旅行を、もっとお得に。
          </p>

          <div className="flex gap-6 text-xs font-medium text-white/85">
            <span className="flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5" />
              限定クーポン
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              エリア別検索
            </span>
          </div>

          {session?.user ? (
            <div className="mt-2 flex flex-col items-center gap-4">
              <p className="text-sm text-white">
                ようこそ、
                <strong className="font-bold">{session.user.name}</strong>
                さん
              </p>
              <Link
                href="/coupons"
                className="btn-glossy group flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
              >
                クーポンを見る
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-sm text-white/80 underline underline-offset-4 transition hover:text-white">
                  ログアウト
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-2 flex gap-3">
              <Link
                href="/signup"
                className="btn-glossy rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
              >
                無料会員登録
              </Link>
              <Link
                href="/login"
                className="surface-glass rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                ログイン
              </Link>
            </div>
          )}
        </div>

        {/* 히어로 위에 떠 있는 유리질감 카드들 — 양쪽에 흩어놓지 않고 왼쪽으로 모아서 정돈된 느낌으로 */}
        <div className="absolute bottom-10 left-4 hidden flex-col items-start gap-3 sm:flex">
          <div
            className="animate-float-slow surface-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
            style={{ animationDelay: "1.2s" }}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            日本語対応の店舗多数
          </div>
          <TiltCard
            max={5}
            className="animate-float-slow surface-glass flex w-44 flex-col gap-1.5 rounded-2xl p-3.5 text-left shadow-elevated"
          >
            <div className="flex items-center gap-1 text-primary">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-3 w-3" fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="text-[11px] font-bold leading-tight text-white">
              日本人利用者の
              <br />
              口コミで安心
            </p>
          </TiltCard>
        </div>
      </main>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h2 className="font-display text-2xl font-black tracking-tight">
              カテゴリから探す
            </h2>
            <div className="mx-auto mt-3 h-1.5 w-16 rounded-full btn-glossy" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.value];
              return (
                <Link key={c.value} href={`/coupons?category=${c.value}`} className="group">
                  <TiltCard
                    max={6}
                    className="relative w-full overflow-hidden rounded-2xl shadow-card transition-shadow duration-300 group-hover:shadow-elevated"
                  >
                    <div className="relative aspect-square w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={CATEGORY_IMAGES[c.value]}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(180deg, rgba(20,16,14,0) 45%, rgba(20,16,14,0.75) 100%)" }}
                      />
                      <span className="btn-glossy absolute left-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground">
                        <Icon className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                      <h3 className="absolute inset-x-0 bottom-2.5 px-2.5 text-[15px] font-bold leading-tight text-white">
                        {c.ja}
                      </h3>
                    </div>
                  </TiltCard>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {!session?.user && (
        <section className="border-t border-border bg-card/60 px-6 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-black tracking-tight">
              会員登録するとこんな特典
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.ja}
                  className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-elevated"
                >
                  <span className="btn-glossy flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-bold leading-tight">
                    {b.ja}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="btn-glossy mt-8 inline-block rounded-full px-7 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
            >
              無料会員登録はこちら
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
