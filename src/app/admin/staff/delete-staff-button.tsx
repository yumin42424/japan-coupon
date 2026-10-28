import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { removeStaff } from "./actions";

export function DeleteStaffButton({ userId, storeId }: { userId: string; storeId: string }) {
  return (
    <ConfirmDeleteForm
      action={removeStaff.bind(null, userId, storeId)}
      message="このスタッフ登録を解除しますか？（会員アカウントは削除されません）"
    />
  );
}
