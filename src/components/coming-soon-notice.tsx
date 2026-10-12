import Link from "next/link";
import { Clock } from "lucide-react";

// 공개된 쿠폰이 하나도 없을 때(제휴 매장 확보 전)만 보여주는 안내. 실제로 있지 않은 쿠폰·업체를
// 있는 것처럼 보이게 하지 않고, 지금 할 수 있는 행동(회원가입/관심지역 설정/이용 가이드)만 안내한다.
export function ComingSoonNotice({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-center shadow-card">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Clock className="h-5 w-5" />
      </span>
      <p className="mt-3 text-h3 text-primary">クーポンは現在準備中です</p>
      <p className="mt-2 text-body text-muted">
        提携店舗の準備ができ次第、順次公開します。公開までもうしばらくお待ちください。
      </p>
      <p className="mt-2 text-caption text-muted">
        LINEでログインして関心エリアを設定しておくと、新しいお店が登録されたときにお知らせします（通知の受け取りに同意された方のみ）。
      </p>
      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {loggedIn ? (
          <Link
            href="/onboarding"
            className="btn-glossy rounded-full px-5 py-2.5 text-body font-bold text-primary-foreground transition hover:brightness-105"
          >
            関心エリアを設定する
          </Link>
        ) : (
          <Link
            href="/signup"
            className="btn-glossy rounded-full px-5 py-2.5 text-body font-bold text-primary-foreground transition hover:brightness-105"
          >
            無料会員登録
          </Link>
        )}
        <Link
          href="/guide"
          className="rounded-full border border-border bg-card px-5 py-2.5 text-body font-medium transition hover:bg-background"
        >
          ご利用ガイドを見る
        </Link>
      </div>
    </div>
  );
}
