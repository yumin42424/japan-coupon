import { Trash2 } from "lucide-react";
import { deleteStore } from "./actions";

export function DeleteStoreButton({ storeId }: { storeId: string }) {
  return (
    <form action={deleteStore.bind(null, storeId)}>
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
