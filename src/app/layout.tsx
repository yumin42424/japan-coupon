import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PublicChrome } from "@/components/public-chrome";

// 見出し用 — 幾何学的で存在感のあるゴシック体。
// 日本語Webフォントは字形ごとに100個以上のファイルに分割されていて、ウェイトを増やすほど
// 「ウェイト数 × ページで使う文字の分割数」だけダウンロードが増える（以前は本文+見出し合計で260ファイル/約3.3MB、
// モバイルのLCPが16〜20秒）。見出しだけ1ウェイトに絞り、本文は端末標準の日本語フォント(globals.css の --font-body)を使う。
const display = Zen_Kaku_Gothic_New({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "K-Coupon Japan | 韓国旅行がもっとお得になるクーポンサイト",
    template: "%s | K-Coupon Japan",
  },
  description:
    "日本人旅行者向けの韓国旅行クーポンサイト。明洞・弘大・江南・聖水など人気エリアのグルメ・美容・ショッピングでお得なクーポンを無料でGET。会員登録・利用は無料です。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "K-Coupon Japan",
    title: "K-Coupon Japan | 韓国旅行がもっとお得になるクーポンサイト",
    description: "日本人旅行者向けの韓国旅行クーポンサイト。人気エリア・カテゴリからお得なクーポンを無料でGET。",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${display.variable} h-full antialiased`}
    >
      {/* body가 flex 컬럼이라 mx-auto 가 붙은 <main>은 "내용 폭만큼"만 잡힌다 — 긴 한 줄 텍스트(truncate 등)가 있으면
          main이 화면보다 넓어져 모바일에서 가로 스크롤이 생기므로, main은 항상 가용 폭을 쓰도록(max-w 는 각 페이지가 지정) 고정한다. */}
      <body className="flex min-h-full flex-col pb-[var(--bottom-nav-h)] md:pb-0 [&>main]:w-full">
        <PublicChrome>
          <Nav />
        </PublicChrome>
        {children}
        <PublicChrome>
          <Footer />
        </PublicChrome>
        <Analytics />
      </body>
    </html>
  );
}
