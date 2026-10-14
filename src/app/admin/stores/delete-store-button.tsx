import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { deleteStore } from "./actions";

export function DeleteStoreButton({ storeId }: { storeId: string }) {
  return (
    <ConfirmDeleteForm
      action={deleteStore.bind(null, storeId)}
      message={"この店舗を削除しますか？\nクーポンの利用履歴や口コミがある場合は、削除せず「掲載停止」にします。"}
    />
  );
}
