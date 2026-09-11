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

export const metadata: Metadata = {
  title: "K-Coupon Japan",
  description: "韓国旅行を、もっとお得に。日本人旅行者限定クーポン。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-16 md:pb-0">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
