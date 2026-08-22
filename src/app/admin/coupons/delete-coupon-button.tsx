import { Trash2 } from "lucide-react";
import { deleteCoupon } from "./actions";

export function DeleteCouponButton({ couponId }: { couponId: string }) {
  return (
    <form action={deleteCoupon.bind(null, couponId)}>
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
