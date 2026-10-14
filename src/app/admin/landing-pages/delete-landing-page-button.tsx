import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { deleteLandingPage } from "./actions";

export function DeleteLandingPageButton({ id }: { id: string }) {
  return <ConfirmDeleteForm action={deleteLandingPage.bind(null, id)} message="このランディングページを削除しますか？" />;
}
