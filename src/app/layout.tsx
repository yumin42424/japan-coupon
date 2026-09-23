import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// 見出し用 — 幾何学的で存在感のあるゴシック体
const display = Zen_Kaku_Gothic_New({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

// 本文用 — 可読性重視の標準的な日本語ゴシック体
const body = Noto_Sans_JP({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-[var(--bottom-nav-h)] md:pb-0">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
