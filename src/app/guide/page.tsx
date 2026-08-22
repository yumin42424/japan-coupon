import Link from "next/link";
import {
  UserPlus,
  Heart,
  Search,
  Ticket,
  Store,
  Languages,
  ShieldCheck,
} from "lucide-react";
import { JaKo } from "@/components/ja-ko";

const STEPS = [
  {
    icon: UserPlus,
    ja: "無料会員登録",
    ko: "무료 회원가입",
    descJa: "メールアドレスだけで簡単に登録できます。",
    descKo: "이메일만 있으면 간단하게 가입할 수 있어요.",
  },
  {
    icon: Heart,
    ja: "興味・エリアを選択",
    ko: "관심사·지역 선택",
    descJa: "旅行の予定と好みに合わせてクーポンをおすすめします。",
    descKo: "여행 일정과 취향에 맞춰 쿠폰을 추천해드려요.",
  },
  {
    icon: Search,
    ja: "クーポンを探す",
    ko: "쿠폰 찾기",
    descJa: "カテゴリ・エリアから気になるクーポンを探せます。",
    descKo: "카테고리·지역별로 원하는 쿠폰을 찾을 수 있어요.",
  },
  {
    icon: Ticket,
    ja: "クーポンをGET",
    ko: "쿠폰 받기",
    descJa: "気に入ったクーポンはワンタップで受け取れます。",
    descKo: "마음에 드는 쿠폰은 한 번의 터치로 받을 수 있어요.",
  },
  {
    icon: Store,
    ja: "韓国で使う",
    ko: "한국에서 사용",
    descJa: "マイページのクーポンを店舗で見せるだけでOK。",
    descKo: "마이페이지의 쿠폰을 매장에서 보여주기만 하면 끝!",
  },
];

const PROMISES = [
  {
    icon: Languages,
    ja: "日本語対応の店舗のみ掲載",
    ko: "일본어 대응 가능한 매장만 소개",
    descJa: "掲載店舗は日本語でのコミュニケーションに対応しています。言葉の不安なく安心してご利用いただけます。",
    descKo: "소개해드리는 매장은 일본어 소통이 가능한 곳들이에요. 언어 걱정 없이 이용하실 수 있습니다.",
  },
  {
    icon: ShieldCheck,
    ja: "ぼったくりの心配なし",
    ko: "바가지 걱정 없이",
    descJa: "事前にクーポンで料金が確定するので、外国人料金を心配する必要がありません。",
    descKo: "미리 쿠폰으로 가격이 정해져 있어서, 외국인 바가지를 걱정하지 않아도 돼요.",
  },
];

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="初めての方へ" ko="처음 이용하시는 분께" />
      </h1>
      <p className="mt-2 text-sm text-muted">
        <JaKo
          ja="K-Coupon Japanの使い方は、たったの5ステップです。"
          ko="K-Coupon Japan 이용 방법은 단 5단계입니다."
        />
      </p>

      <ol className="mt-8 flex flex-col gap-4">
        {STEPS.map((step, i) => (
          <li
            key={step.ja}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-bold">
                <step.icon className="h-4 w-4 text-primary" />
                <JaKo ja={step.ja} ko={step.ko} />
              </p>
              <p className="mt-1 text-sm text-muted">
                <JaKo ja={step.descJa} ko={step.descKo} />
              </p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-lg font-extrabold tracking-tight">
        <JaKo ja="安心してご利用いただくために" ko="안심하고 이용하실 수 있도록" />
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        {PROMISES.map((promise) => (
          <div
            key={promise.ja}
            className="rounded-2xl border border-border bg-primary/5 p-5"
          >
            <p className="flex items-center gap-2 font-bold text-primary">
              <promise.icon className="h-5 w-5" />
              <JaKo ja={promise.ja} ko={promise.ko} />
            </p>
            <p className="mt-1.5 text-sm text-foreground/80">
              <JaKo ja={promise.descJa} ko={promise.descKo} />
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/signup"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
        >
          <JaKo ja="無料会員登録はこちら" ko="무료 회원가입 하러가기" />
        </Link>
      </div>
    </main>
  );
}
