import type { Metadata } from "next";
import { SignupForm } from "./signup-form";
import { SIGNUPS_ENABLED } from "@/lib/feature-flags";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("無料会員登録"),
    description: t("K-Coupon Japanに無料で会員登録して、韓国旅行で使えるクーポンをGETしよう。"),
  };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string; callbackUrl?: string }>;
}) {
  const t = await getT();
  const { utm_source, callbackUrl } = await searchParams;

  if (!SIGNUPS_ENABLED) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-sm flex-col justify-center px-6 py-12">
        <h1 className="text-h1 font-display tracking-tight">
          {t("準備中です")}
        </h1>
        <p className="mt-2 text-body text-muted">
          {t("現在、会員登録機能を準備しています。もうしばらくお待ちください。")}
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-7 sm:p-8">
        <h1 className="text-h1 font-display tracking-tight">
          {t("無料会員登録")}
        </h1>
        <p className="mt-2 text-body text-muted">
          {t("会員登録（無料）すると、会員限定クーポンが公開されたときにGETできます。")}
        </p>

        <SignupForm acquisitionSource={utm_source ?? "direct"} callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
