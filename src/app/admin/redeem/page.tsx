import { TicketCheck } from "lucide-react";
import { RedeemForm } from "./redeem-form";

export default function AdminRedeemPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <TicketCheck className="h-6 w-6 text-primary" />
        クーポン使用処理
      </h1>
      <p className="mt-2 text-sm text-muted">
        会員のマイページに表示されるクーポンコードを入力してください。
      </p>

      <div className="mt-6">
        <RedeemForm />
      </div>
    </main>
  );
}
