import { getT } from "@/i18n/server";

const LINE_URL = "https://line.me/R/ti/p/@490gzucs";

export default async function SupportPage() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">{t("お問い合わせ")}</h1>
      <p className="mt-4 text-body-lg text-foreground/80">
        {t("ご不明な点は、LINE公式アカウント（@490gzucs）よりお気軽にお問い合わせください。担当者が確認次第、順次ご返信いたします。")}
      </p>

      <a
        href={LINE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#06C755] px-6 py-3 text-body font-semibold text-white transition hover:opacity-90"
      >
        {t("LINEで問い合わせる")}
      </a>

      <p className="mt-6 text-body text-muted">
        {t("よくあるご質問は、トップページの「よくある質問」もあわせてご確認ください。")}
      </p>
    </main>
  );
}
