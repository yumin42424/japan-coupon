import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Heart,
  Languages,
  CalendarClock,
  CheckCircle2,
  Lock,
  MapPin,
  Clock,
  PhoneCall,
  Info,
  Flame,
  Timer,
  Users,
  Star,
  Trash2,
} from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES } from "@/lib/taxonomy-images";
import { daysUntil, isUrgentDeadline } from "@/lib/urgency";
import { issueCoupon, toggleFavorite, deleteReview } from "./actions";
import { ReviewForm } from "./review-form";
import { ViewTracker } from "./view-tracker";

type CouponDetail = {
  id: string;
  title: string;
  discount_info: string | null;
  valid_from: string;
  valid_to: string;
  member_only: boolean;
  regular_price: number | null;
  discounted_price: number | null;
  usage_condition: string | null;
  quantity_limit: number | null;
  is_active: boolean;
  stores: {
    id: string;
    name: string;
    category: string;
    area: string;
    line_available: boolean;
    popular_with_japanese: boolean;
    address: string | null;
    business_hours: string | null;
    reservation_info: string | null;
    is_active: boolean;
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("coupons")
    .select("title, discount_info, regular_price, discounted_price, stores(name, category, area)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return {};
  const coupon = data as unknown as Pick<CouponDetail, "title" | "discount_info" | "regular_price" | "discounted_price"> & {
    stores: CouponDetail["stores"] | null;
  };
  const store = coupon.stores;
  const category = store ? CATEGORIES.find((c) => c.value === store.category) : undefined;
  const area = store ? AREAS.find((a) => a.value === store.area) : undefined;
  const discountRate =
    coupon.regular_price && coupon.discounted_price
      ? Math.round((1 - coupon.discounted_price / coupon.regular_price) * 100)
      : null;

  const title = store
    ? `${store.name}｜${coupon.title}${discountRate !== null ? `（${discountRate}%OFF）` : ""}`
    : coupon.title;
  const description = [store && area && category ? `${area.ja}・${category.ja}の${store.name}` : null, coupon.discount_info]
    .filter(Boolean)
    .join(" ");

  return {
    title,
    description: description || undefined,
    openGraph: { title, description: description || undefined },
  };
}

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const { data } = await supabaseAdmin
    .from("coupons")
    .select(
      "id, title, discount_info, valid_from, valid_to, member_only, regular_price, discounted_price, usage_condition, quantity_limit, is_active, stores(id, name, category, area, line_available, popular_with_japanese, address, business_hours, reservation_info, is_active)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const coupon = data as unknown as CouponDetail;
  const store = coupon.stores;

  let issuedCount = 0;
  if (coupon.quantity_limit != null) {
    const { count } = await supabaseAdmin
      .from("coupon_events")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", id)
      .eq("event_type", "issue");
    issuedCount = count ?? 0;
  }
  const remaining = coupon.quantity_limit != null ? coupon.quantity_limit - issuedCount : null;
  const isSoldOut = remaining !== null && remaining <= 0;
  const isExpired = coupon.valid_to < new Date().toISOString().slice(0, 10);
  const isUnavailable = !coupon.is_active || !store.is_active;
  const urgent = isUrgentDeadline(coupon.valid_to);
  const daysLeft = daysUntil(coupon.valid_to);

  let alreadyIssued = false;
  let isFavorited = false;
  let canReview = false;
  if (session?.user?.id) {
    const [{ data: issuedRow }, { data: favoriteRow }, { data: usedRows }] = await Promise.all([
      supabaseAdmin
        .from("coupon_events")
        .select("id")
        .eq("coupon_id", id)
        .eq("user_id", session.user.id)
        .eq("event_type", "issue")
        .maybeSingle(),
      supabaseAdmin
        .from("coupon_events")
        .select("id")
        .eq("coupon_id", id)
        .eq("user_id", session.user.id)
        .eq("event_type", "favorite")
        .maybeSingle(),
      supabaseAdmin
        .from("coupon_events")
        .select("id, coupons!inner(store_id)")
        .eq("user_id", session.user.id)
        .eq("event_type", "use")
        .eq("coupons.store_id", store.id)
        .limit(1),
    ]);
    alreadyIssued = !!issuedRow;
    isFavorited = !!favoriteRow;
    canReview = !!usedRows && usedRows.length > 0;
  }

  type ReviewRow = {
    id: string;
    rating: number;
    body: string;
    created_at: string;
    user_id: string;
    users: { nickname: string } | null;
  };
  const { data: reviewRows } = await supabaseAdmin
    .from("reviews")
    .select("id, rating, body, created_at, user_id, users(nickname)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const reviews = (reviewRows ?? []) as unknown as ReviewRow[];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;
  const myReview = session?.user?.id
    ? reviews.find((r) => r.user_id === session.user!.id)
    : undefined;

  const category = CATEGORIES.find((c) => c.value === store.category);
  const area = AREAS.find((a) => a.value === store.area);
  const CategoryIcon = category ? CATEGORY_ICONS[category.value] : null;
  const discountRate =
    coupon.regular_price && coupon.discounted_price
      ? Math.round((1 - coupon.discounted_price / coupon.regular_price) * 100)
      : null;

  return (
    <main className="mx-auto max-w-md px-6 pb-10 pt-0">
      <ViewTracker couponId={id} />

      {/* 写真バナー — カード一覧と同じカテゴリ写真を使い、実店舗の写真がなくても
          「アイコンだけ」より商品として魅力的に見えるようにする */}
      <div className="relative -mx-6 aspect-[16/10] w-[calc(100%+3rem)] overflow-hidden bg-primary/10 sm:mx-0 sm:w-full sm:rounded-b-3xl">
        {CATEGORY_IMAGES[store.category] && (
          <Image
            src={CATEGORY_IMAGES[store.category]}
            alt=""
            fill
            priority
            sizes="(min-width: 448px) 448px, 100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/0" />

        <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-soft">
          {CategoryIcon && <CategoryIcon className="h-5 w-5" strokeWidth={2.25} />}
        </span>

        {session?.user && (
          <form action={toggleFavorite.bind(null, id)} className="absolute right-4 top-4">
            <button
              type="submit"
              aria-label={isFavorited ? "お気に入りから外す" : "お気に入りに追加"}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition focus-visible:ring-4 focus-visible:ring-white/40 ${
                isFavorited ? "bg-primary text-white" : "bg-white/80 text-foreground hover:bg-white"
              }`}
            >
              <Heart className="h-5 w-5" fill={isFavorited ? "currentColor" : "none"} strokeWidth={2} />
            </button>
          </form>
        )}

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1 text-caption text-white/85">
              <span>{category?.ja}</span>
              <span>・</span>
              <span className="flex items-center gap-0.5">
                <AreaIcon className="h-3 w-3" />
                {area?.ja}
              </span>
            </p>
            <h1 className="mt-0.5 break-words text-h1 text-white">{store.name}</h1>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {coupon.member_only && (
          <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-caption text-primary">
            <Lock className="h-2.5 w-2.5" />
            会員限定
          </span>
        )}
        {store.popular_with_japanese && (
          <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-caption font-medium text-orange-500">
            <Flame className="h-2.5 w-2.5" />
            日本人に人気
          </span>
        )}
        {avgRating !== null && (
          <span className="flex items-center gap-1 text-caption text-muted">
            <Star className="h-3.5 w-3.5 text-primary" fill="currentColor" strokeWidth={0} />
            <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
            <span>({reviews.length}件の口コミ)</span>
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
          <div className="bg-primary/10 px-5 py-4">
            <p className="text-2xl font-extrabold tracking-tight text-primary">{coupon.title}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground/70">{coupon.discount_info}</p>
            {(urgent || remaining !== null) && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5">
                {urgent && (
                  <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    <Timer className="h-3 w-3" />
                    {daysLeft <= 0 ? "本日締切" : `あと${daysLeft}日`}
                  </span>
                )}
                {remaining !== null && (
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                      isSoldOut
                        ? "bg-border text-muted"
                        : "bg-orange-500/15 text-orange-500"
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    {isSoldOut ? "満了しました" : `残り${remaining}枚`}
                  </span>
                )}
              </p>
            )}
            {(coupon.regular_price || coupon.discounted_price) && (
              <p className="mt-1.5 flex items-center gap-2">
                {coupon.regular_price && (
                  <span className="text-sm text-muted line-through">
                    ¥{coupon.regular_price.toLocaleString()}
                  </span>
                )}
                {coupon.discounted_price && (
                  <span className="text-lg font-bold">¥{coupon.discounted_price.toLocaleString()}</span>
                )}
                {discountRate !== null && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    -{discountRate}%
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 px-5 py-4 text-sm">
            <p className="flex items-center gap-2 text-muted">
              <CalendarClock className="h-4 w-4 shrink-0" />
              利用期間: {coupon.valid_from} 〜 {coupon.valid_to}
            </p>
            {coupon.usage_condition && (
              <p className="flex items-center gap-2 text-muted">
                <Info className="h-4 w-4 shrink-0" />
                {coupon.usage_condition}
              </p>
            )}
            {store.address && (
              <p className="flex items-center gap-2 text-muted">
                <MapPin className="h-4 w-4 shrink-0" />
                {store.address}
              </p>
            )}
            {store.business_hours && (
              <p className="flex items-center gap-2 text-muted">
                <Clock className="h-4 w-4 shrink-0" />
                {store.business_hours}
              </p>
            )}
            {store.reservation_info && (
              <p className="flex items-center gap-2 text-muted">
                <PhoneCall className="h-4 w-4 shrink-0" />
                {store.reservation_info}
              </p>
            )}
            {store.line_available && (
              <p className="flex items-center gap-2 text-success">
                <Languages className="h-4 w-4 shrink-0" />
                日本語対応可能
              </p>
            )}
          </div>
        </div>

      {store.category === "medical" && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-xs leading-relaxed text-muted">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="block font-bold text-foreground">医療サービスについて</span>
            掲載情報は、特定の診断・治療・施術を医学的に推奨するものではありません。施術の効果・リスク・副作用・適応には個人差があります。施術を受ける前に、医療機関から十分な説明を受けてください。
          </p>
        </div>
      )}

      {/* モバイルでは画面下部に固定して常に見える状態にする（店頭で提示する導線を優先）。
          下部タブバーと同じ --bottom-nav-h を基準にするので、機種によってタブバーの
          高さが変わっても隙間がずれない。 */}
      <div className="sticky bottom-[var(--bottom-nav-h)] z-10 -mx-6 mt-6 border-t border-border bg-background/95 px-6 py-3 backdrop-blur-md md:static md:mx-0 md:mt-6 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <div className="flex items-center gap-3 md:block">
          {discountRate !== null && (
            <span className="shrink-0 text-lg font-extrabold text-primary md:hidden">
              -{discountRate}%
            </span>
          )}
          <div className="min-w-0 flex-1">
            {alreadyIssued ? (
              <p className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-center text-sm font-medium text-muted md:py-3.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                GET済み
              </p>
            ) : isUnavailable ? (
              <p className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-center text-sm font-medium text-muted md:py-3.5">
                <Info className="h-4 w-4" />
                現在ご利用いただけません
              </p>
            ) : isExpired ? (
              <p className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-center text-sm font-medium text-muted md:py-3.5">
                <CalendarClock className="h-4 w-4" />
                有効期限が終了しました
              </p>
            ) : isSoldOut ? (
              <p className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-center text-sm font-medium text-muted md:py-3.5">
                <Users className="h-4 w-4" />
                先着順の受付は終了しました
              </p>
            ) : (
              <form action={issueCoupon.bind(null, id)}>
                <button
                  type="submit"
                  className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-card transition hover:brightness-105 active:scale-[0.99] md:py-3.5"
                >
                  無料でGET
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          口コミ
          <span className="text-muted">({reviews.length})</span>
        </h2>

        {canReview && <ReviewForm storeId={store.id} couponId={id} initialRating={myReview?.rating} initialBody={myReview?.body} />}

        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
            まだ口コミはありません。
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {reviews.map((review) => {
              const canDelete =
                session?.user?.id === review.user_id || isAdminEmail(session?.user?.email);
              return (
                <li key={review.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-3.5 w-3.5 ${n <= review.rating ? "text-primary" : "text-border"}`}
                          fill={n <= review.rating ? "currentColor" : "none"}
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                    {canDelete && (
                      <form action={deleteReview.bind(null, review.id, id)}>
                        <button
                          type="submit"
                          aria-label="口コミを削除"
                          className="text-muted transition hover:text-primary focus-visible:ring-4 focus-visible:ring-primary/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{review.body}</p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                    <span>{review.users?.nickname ?? "会員"}</span>
                    <span>・</span>
                    <span>{new Date(review.created_at).toISOString().slice(0, 10)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
