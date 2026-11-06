import Link from "next/link";
import { getT } from "@/i18n/server";

// 公開されたクーポンが一つもないとき(提携店舗の確保前)だけ表示するお知らせ。実際にはないクーポン・店舗を
// あるように見せず、今できること(会員登録/関心エリアの設定/ご利用ガイド)だけを案内する。
export async function ComingSoonNotice({ loggedIn }: { loggedIn: boolean }) {
  const t = await getT();
  return (
    <div className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-5 sm:p-6">
      <p className="text-h3">{t("クーポンは現在準備中です")}</p>
      <p className="mt-2 text-body text-muted">{t("提携店舗の準備ができ次第、順次公開します。")}</p>
      <p className="mt-2 text-caption text-muted">
        {t("LINEでログインして関心エリアを設定しておくと、新しいお店が登録されたときにお知らせします（通知の受け取りに同意された方のみ）。")}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {loggedIn ? (
          <Link
            href="/onboarding"
            className="btn-glossy rounded-lg px-5 py-2.5 text-center text-body font-bold text-primary-foreground transition hover:brightness-105"
          >
            {t("関心エリアを設定する")}
          </Link>
        ) : (
          <Link
            href="/signup"
            className="btn-glossy rounded-lg px-5 py-2.5 text-center text-body font-bold text-primary-foreground transition hover:brightness-105"
          >
            {t("無料会員登録")}
          </Link>
        )}
        <Link
          href="/guide"
          className="rounded-lg border border-border bg-card px-5 py-2.5 text-center text-body font-medium transition hover:bg-background"
        >
          {t("ご利用ガイドを見る")}
        </Link>
      </div>
    </div>
  );
}
