import { notFound, redirect } from "next/navigation";
import { TicketCheck } from "lucide-react";
import { auth } from "@/auth";
import { getRedeemActor } from "@/lib/staff";
import { RedeemForm } from "@/app/admin/redeem/redeem-form";
import { processStaffRedeem } from "@/app/admin/redeem/actions";

// 매장 직원용 쿠폰 사용 처리. 로그인하지 않았으면 로그인으로 보내고,
// 관리자도 아니고 매장 직원 연결도 없는 회원에게는 이 페이지가 있다는 사실도 알려주지 않는다(404).
export default async function StaffRedeemPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent("/staff/redeem")}`);
  if (!(await getRedeemActor())) notFound();

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="flex items-center gap-2 text-h1 font-display tracking-tight">
        <TicketCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        クーポン使用処理
      </h1>
      <p className="mt-2 text-body text-muted">
        お客様のマイページに表示されるクーポンコードを入力するか、QRコードを読み取ってください。
        ご自身が担当する店舗のクーポンのみ処理できます。
      </p>

      <div className="mt-6">
        <RedeemForm action={processStaffRedeem} resetHref="/staff/redeem" />
      </div>
    </main>
  );
}
