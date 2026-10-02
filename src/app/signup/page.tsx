import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { SignupForm } from "./signup-form";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "無料会員登録",
  description: "K-Coupon Japanに無料で会員登録して、韓国旅行で使えるクーポンをGETしよう。",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string; callbackUrl?: string }>;
}) {
  const { utm_source, callbackUrl } = await searchParams;

  if (!SIGNUPS_ENABLED) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col justify-center px-6 py-12">
        <h1 className="text-h1 font-display tracking-tight">
          準備中です
        </h1>
        <p className="mt-2 text-body text-muted">
          現在、会員登録機能を準備しています。もうしばらくお待ちください。
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-elevated sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserPlus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <h1 className="text-h1 font-display mt-4 tracking-tight">
          無料会員登録
        </h1>
        <p className="mt-2 text-body text-muted">
          会員登録すると、会員限定クーポンをGETできます。
        </p>

        <SignupForm acquisitionSource={utm_source ?? "direct"} callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
