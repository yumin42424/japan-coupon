import { supabaseAdmin } from "@/lib/supabase-admin";
import { JaKo } from "@/components/ja-ko";
import { NearbyList } from "./nearby-list";

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
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabaseAdmin
    .from("coupons")
    .select(
      "id, title, discount_info, member_only, stores!inner(id, name, category, area, latitude, longitude)"
    )
    .gte("valid_to", today)
    .not("stores.latitude", "is", null)
    .not("stores.longitude", "is", null);

  const coupons = (data ?? []) as unknown as NearbyCoupon[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="現在地から探す" ko="내 주변에서 찾기" />
      </h1>
      <p className="mt-2 text-sm text-muted">
        <JaKo
          ja="位置情報を許可すると、近くのクーポンが近い順に表示されます。"
          ko="위치 정보를 허용하면 가까운 쿠폰부터 보여드려요."
        />
      </p>

      <NearbyList coupons={coupons} />
    </main>
  );
}
