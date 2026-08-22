import { Trash2 } from "lucide-react";
import { deleteNotice } from "./actions";

export function DeleteNoticeButton({ noticeId }: { noticeId: string }) {
  return (
    <form action={deleteNotice.bind(null, noticeId)}>
      <button
        type="submit"
        aria-label="delete"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-primary"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
