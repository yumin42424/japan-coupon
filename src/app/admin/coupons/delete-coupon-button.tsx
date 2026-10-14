import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { deleteCoupon } from "./actions";

export function DeleteCouponButton({ couponId }: { couponId: string }) {
  return (
    <ConfirmDeleteForm
      action={deleteCoupon.bind(null, couponId)}
      message={"このクーポンを削除しますか？\n会員の取得・利用履歴がある場合は、履歴を守るため削除せず「掲載停止」にします。"}
    />
  );
}
