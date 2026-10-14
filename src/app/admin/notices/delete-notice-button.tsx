import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { deleteNotice } from "./actions";

export function DeleteNoticeButton({ noticeId }: { noticeId: string }) {
  return <ConfirmDeleteForm action={deleteNotice.bind(null, noticeId)} message="このお知らせを削除しますか？" />;
}
