import { todayKST } from "@/lib/date";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NearbyList } from "./nearby-list";
import { getT } from "@/i18n/server";
import { translateRows } from "@/i18n/content";
import { COUPON_TEXT } from "@/i18n/content-fields";

export type NearbyCoupon = {
  id: string;
  title: string;
  discount_info: string | null;
  member_only: boolean;
  stores: {
    id: string;
    name: string;
    category: string;
    area: string;
    latitude: number;
    longitude: number;
  };
};

export default async function NearbyPage() {
  const t = await getT();
  const today = todayKST();

  const { data } = await supabaseAdmin
    .from("coupons")
    .select(
      "id, title, discount_info, member_only, stores!inner(id, name, category, area, latitude, longitude)"
    )
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .eq("is_demo", false)
    .eq("stores.is_demo", false)
    .gte("valid_to", today)
    .not("stores.latitude", "is", null)
    .not("stores.longitude", "is", null);

  const coupons = await translateRows((data ?? []) as unknown as NearbyCoupon[], COUPON_TEXT);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">
        {t("現在地から探す")}
      </h1>
      <p className="mt-2 text-body text-muted">
        {t("位置情報を許可すると、近くのクーポンが近い順に表示されます。")}
      </p>

      <NearbyList coupons={coupons} />
    </main>
  );
}
