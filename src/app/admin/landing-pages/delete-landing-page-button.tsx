import { Trash2 } from "lucide-react";
import { deleteLandingPage } from "./actions";

export function DeleteLandingPageButton({ id }: { id: string }) {
  return (
    <form action={deleteLandingPage.bind(null, id)}>
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
