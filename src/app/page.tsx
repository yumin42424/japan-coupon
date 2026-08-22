import Link from "next/link";
import { ArrowRight, Sparkles, Ticket, MapPin, Store, Bell, Percent } from "lucide-react";
import { auth, signOut } from "@/auth";
import { JaKo } from "@/components/ja-ko";

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
      <main className="relative flex min-h-[calc(100vh-65px)] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]"
        />

        <div className="relative flex max-w-sm flex-col items-center gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <JaKo ja="日本人旅行者限定" ko="일본인 여행자 전용" />
          </span>

          <h1 className="text-4xl font-extrabold tracking-tight">
            K-Coupon <span className="text-primary">Japan</span>
          </h1>
          <p className="-mt-2 text-base text-muted">
            <JaKo ja="韓国旅行を、もっとお得に。" ko="한국여행을, 더 알뜰하게." />
          </p>

          <div className="flex gap-6 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-primary" />
              <JaKo ja="限定クーポン" ko="한정 쿠폰" />
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <JaKo ja="エリア別検索" ko="지역별 검색" />
            </span>
          </div>

          {session?.user ? (
            <div className="mt-2 flex flex-col items-center gap-4">
              <p className="text-sm">
                <JaKo ja="ようこそ、" ko="환영합니다, " />
                <strong className="font-bold">{session.user.name}</strong>
                <JaKo ja="さん" ko="님" />
              </p>
              <Link
                href="/coupons"
                className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
              >
                <JaKo ja="クーポンを見る" ko="쿠폰 보러 가기" />
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-sm text-muted underline underline-offset-4 transition hover:text-foreground">
                  <JaKo ja="ログアウト" ko="로그아웃" />
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-2 flex gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
              >
                <JaKo ja="無料会員登録" ko="무료 회원가입" />
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-card"
              >
                <JaKo ja="ログイン" ko="로그인" />
              </Link>
            </div>
          )}
        </div>
      </main>

      {!session?.user && (
        <section className="border-t border-border bg-card/40 px-6 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-extrabold tracking-tight">
              <JaKo ja="会員登録するとこんな特典" ko="회원가입하면 이런 혜택" />
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
                    <JaKo ja={b.ja} ko={b.ko} />
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
            >
              <JaKo ja="無料会員登録はこちら" ko="무료 회원가입 하러가기" />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
