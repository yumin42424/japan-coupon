import Link from "next/link";
import { ArrowRight, Sparkles, Ticket, MapPin, Store, Bell, Percent } from "lucide-react";
import { auth, signOut } from "@/auth";
import { CATEGORIES } from "@/lib/taxonomy";
import { CATEGORY_ICONS } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES, HERO_IMAGE } from "@/lib/taxonomy-images";

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
      <main className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
        <div aria-hidden className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
          {/* 사진 위 텍스트 가독성용 스크림은 라이트/다크 테마와 무관하게 항상 어둡게 고정 */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(20,16,14,0.45) 0%, rgba(20,16,14,0.85) 100%)",
            }}
          />
        </div>

        <div className="relative flex max-w-sm flex-col items-center gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            日本人旅行者限定
          </span>

          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
            K-Coupon Japan
          </h1>
          <p className="-mt-2 text-base text-white/90">
            韓国旅行を、もっとお得に。
          </p>

          <div className="flex gap-6 text-xs text-white/80">
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
                className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
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
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
              >
                無料会員登録
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                ログイン
              </Link>
            </div>
          )}
        </div>
      </main>

      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-tight">
              カテゴリから探す
            </h2>
            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-primary" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
        </div>
      </section>

      {!session?.user && (
        <section className="border-t border-border bg-card/40 px-6 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-extrabold tracking-tight">
              会員登録するとこんな特典
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.ja}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
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
              className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
            >
              無料会員登録はこちら
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
