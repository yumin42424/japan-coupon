import Link from "next/link";
import { getT } from "@/i18n/server";

const STEPS = [
  {
    title: "無料会員登録",
    // 가입에는 이메일 외에 비밀번호·닉네임도 필요하므로 "メールアドレスだけ"라고 쓰지 않는다.
    desc: "メールアドレスとパスワード、ニックネームを入力して登録します。登録は無料です。",
  },
  {
    title: "興味・エリアを選択",
    desc: "旅行の予定と好みを登録しておくと、マイページで合うクーポンをおすすめします。",
  },
  {
    title: "クーポンを探す",
    desc: "カテゴリ・エリアから気になるクーポンを探せます。",
  },
  {
    title: "クーポンをGET",
    desc: "気に入ったクーポンはワンタップで受け取れます。",
  },
  {
    title: "韓国で使う",
    desc: "マイページのクーポン画面を、お店で見せてください。",
  },
];

const NOTES = [
  {
    // 상세 페이지는 일본어 대응이 "가능한" 매장에만 표시한다(불가 표시는 없음) — 그 사실대로 쓴다.
    title: "日本語で対応できるお店がわかる",
    desc: "日本語で対応できるお店には、クーポンページに「日本語対応可能」と表示しています。",
  },
  {
    // 이전 문구("ぼったくりの心配なし")는 실제로 보장하는 장치가 없는 절대적 표현이라 사실에 맞게 바꿨다.
    title: "クーポンの内容を事前に確認できる",
    desc: "割引の内容・対象・有効期限を、お店に行く前にクーポンページで確認できます。",
  },
];

export default async function GuidePage() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">{t("初めての方へ")}</h1>
      <p className="mt-2 text-body-lg text-foreground/80">{t("K-Coupon Japanの使い方は、次の5つの手順です。")}</p>

      <ol className="mt-8 divide-y divide-border border-y border-border">
        {STEPS.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-2 py-4">
            <span className="text-h3 text-primary">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-h3">{t(step.title)}</p>
              <p className="mt-1 text-body text-muted">{t(step.desc)}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-h2 font-display tracking-tight">{t("ご利用にあたって")}</h2>
      <dl className="mt-4 divide-y divide-border border-y border-border">
        {NOTES.map((note) => (
          <div key={note.title} className="py-4">
            <dt className="text-h3">{t(note.title)}</dt>
            <dd className="mt-1 text-body text-foreground/80">{t(note.desc)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10">
        <Link
          href="/signup"
          className="btn-glossy inline-block rounded-lg px-6 py-3 text-body font-bold text-primary-foreground transition hover:brightness-105"
        >
          {t("無料会員登録はこちら")}
        </Link>
      </div>
    </main>
  );
}
