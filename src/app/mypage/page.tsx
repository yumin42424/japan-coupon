import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Ticket, CheckCircle2, ChevronRight, Pencil, Sparkles, Settings, Coins } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { JaKo } from "@/components/ja-ko";

type CouponEventItem = {
  id?: string;
  created_at: string;
  coupons: {
    id: string;
    title: string;
    discount_info: string | null;
    valid_to: string;
    stores: { name: string } | null;
  } | null;
};

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  const [profileRes, categoriesRes, areasRes, favoritedRes, issuedRes, usedRes, allCouponsRes, pointsRes] =
    await Promise.all([
      supabaseAdmin.from("users").select("nickname, email, travel_date").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_interest_categories").select("category").eq("user_id", userId),
      supabaseAdmin.from("user_interest_areas").select("area").eq("user_id", userId),
      supabaseAdmin
        .from("coupon_events")
        .select("created_at, coupons(id, title, discount_info, valid_to, stores(name))")
        .eq("user_id", userId)
        .eq("event_type", "favorite")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("coupon_events")
        .select("id, created_at, coupons(id, title, discount_info, valid_to, stores(name))")
        .eq("user_id", userId)
        .eq("event_type", "issue")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("coupon_events")
        .select("created_at, coupons(id, title, discount_info, valid_to, stores(name))")
        .eq("user_id", userId)
        .eq("event_type", "use")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("coupons")
        .select("id, title, discount_info, valid_to, stores(id, name, category, area)")
        .gte("valid_to", today),
      supabaseAdmin.from("point_events").select("points").eq("user_id", userId),
    ]);

  const profile = profileRes.data;
  const pointBalance = ((pointsRes.data ?? []) as { points: number }[]).reduce(
    (sum, p) => sum + p.points,
    0
  );
  const myCategories = ((categoriesRes.data ?? []) as { category: string }[]).map(
    (row) => CATEGORIES.find((c) => c.value === row.category)
  );
  const myAreas = ((areasRes.data ?? []) as { area: string }[]).map((row) =>
    AREAS.find((a) => a.value === row.area)
  );
  const favorited = (favoritedRes.data ?? []) as unknown as CouponEventItem[];
  const issued = (issuedRes.data ?? []) as unknown as CouponEventItem[];
  const used = (usedRes.data ?? []) as unknown as CouponEventItem[];
  const usedCouponIds = new Set<string>(used.flatMap((u) => (u.coupons?.id ? [u.coupons.id] : [])));

  const myCategoryValues = new Set<string>(myCategories.flatMap((c) => (c ? [c.value] : [])));
  const myAreaValues = new Set<string>(myAreas.flatMap((a) => (a ? [a.value] : [])));
  const issuedCouponIds = new Set<string>(
    issued.flatMap((i) => (i.coupons?.id ? [i.coupons.id] : []))
  );

  type RecommendedCoupon = {
    id: string;
    title: string;
    discount_info: string | null;
    valid_to: string;
    stores: { id: string; name: string; category: string; area: string } | null;
  };
  const allCoupons = (allCouponsRes.data ?? []) as unknown as RecommendedCoupon[];
  const recommended = allCoupons
    .filter(
      (c) =>
        c.stores &&
        !issuedCouponIds.has(c.id) &&
        (myCategoryValues.has(c.stores.category) || myAreaValues.has(c.stores.area))
    )
    .slice(0, 4)
    .map((c) => ({ created_at: "", coupons: c }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="マイページ" ko="마이페이지" />
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{profile?.nickname}</p>
            <p className="text-sm text-muted">{profile?.email}</p>
            <p className="mt-1.5 flex items-center gap-1 text-sm font-bold text-primary">
              <Coins className="h-4 w-4" />
              {pointBalance.toLocaleString()}
              <span className="font-normal text-muted">
                <JaKo ja="ポイント" ko="포인트" />
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/mypage/settings"
              aria-label="settings"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:bg-background"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/onboarding"
              className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium transition hover:bg-background"
            >
              <Pencil className="h-3.5 w-3.5" />
              <JaKo ja="編集" ko="수정" />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <p>
            <span className="text-muted">
              <JaKo ja="旅行予定日" ko="여행 예정일" />:{" "}
            </span>
            {profile?.travel_date ?? (
              <span className="text-muted">
                <JaKo ja="未設定" ko="미설정" />
              </span>
            )}
          </p>
          <p>
            <span className="text-muted">
              <JaKo ja="興味カテゴリ" ko="관심 카테고리" />:{" "}
            </span>
            {myCategories.length
              ? myCategories.map((c) => `${c?.ja}(${c?.ko})`).join(", ")
              : <span className="text-muted"><JaKo ja="未設定" ko="미설정" /></span>}
          </p>
          <p>
            <span className="text-muted">
              <JaKo ja="関心エリア" ko="관심 지역" />:{" "}
            </span>
            {myAreas.length
              ? myAreas.map((a) => `${a?.ja}(${a?.ko})`).join(", ")
              : <span className="text-muted"><JaKo ja="未設定" ko="미설정" /></span>}
          </p>
        </div>
      </section>

      {(myCategoryValues.size > 0 || myAreaValues.size > 0) && recommended.length > 0 && (
        <CouponListSection
          icon={Sparkles}
          titleJa="あなたへのおすすめ"
          titleKo="관심사 기반 추천"
          items={recommended}
        />
      )}

      <CouponListSection
        icon={Heart}
        titleJa="お気に入りクーポン"
        titleKo="찜한 쿠폰"
        items={favorited}
      />
      <CouponListSection
        icon={Ticket}
        titleJa="GETしたクーポン"
        titleKo="받은 쿠폰"
        items={issued}
        usedCouponIds={usedCouponIds}
      />
      <CouponListSection
        icon={CheckCircle2}
        titleJa="使用済みクーポン"
        titleKo="사용한 쿠폰"
        items={used}
      />
    </main>
  );
}

function CouponListSection({
  icon: Icon,
  titleJa,
  titleKo,
  items,
  usedCouponIds,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleJa: string;
  titleKo: string;
  items: CouponEventItem[];
  usedCouponIds?: Set<string>;
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon className="h-5 w-5 text-primary" />
        {titleJa} ({titleKo})
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          <JaKo ja="まだありません" ko="아직 없습니다" />
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((item, i) => {
            const coupon = item.coupons;
            if (!coupon) return null;
            const isUsed = usedCouponIds?.has(coupon.id);
            return (
              <li key={`${coupon.id}-${i}`}>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40">
                  <Link href={`/coupons/${coupon.id}`} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-xs text-muted">{coupon.stores?.name}</span>
                      <span className="mt-0.5 block truncate font-bold text-primary">{coupon.title}</span>
                      <span className="block truncate text-sm text-muted">{coupon.discount_info}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                  </Link>
                  {usedCouponIds && (
                    <div className="mt-3 border-t border-border pt-3">
                      {isUsed ? (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <JaKo ja="使用済み" ko="사용완료" />
                        </p>
                      ) : item.id ? (
                        <div>
                          <p className="text-xs text-muted">
                            <JaKo ja="店舗でこのコードを提示してください" ko="매장에서 이 코드를 보여주세요" />
                          </p>
                          <p className="mt-1 select-all break-all rounded-lg bg-background px-2.5 py-1.5 font-mono text-xs">
                            {item.id}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
