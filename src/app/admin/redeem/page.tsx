import { TicketCheck } from "lucide-react";
import { JaKo } from "@/components/ja-ko";
import { RedeemForm } from "./redeem-form";

export default function AdminRedeemPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <TicketCheck className="h-6 w-6 text-primary" />
        <JaKo ja="クーポン使用処理" ko="쿠폰 사용 처리" />
      </h1>
      <p className="mt-2 text-sm text-muted">
        <JaKo
          ja="会員のマイページに表示されるクーポンコードを入力してください。"
          ko="회원 마이페이지에 표시되는 쿠폰 코드를 입력해주세요."
        />
      </p>

      <div className="mt-6">
        <RedeemForm />
      </div>
    </main>
  );
}
