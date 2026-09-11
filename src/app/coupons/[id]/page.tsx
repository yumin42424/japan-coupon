import { notFound } from "next/navigation";
import Link from "next/link";
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
  };
};

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
      "id, title, discount_info, valid_from, valid_to, member_only, regular_price, discounted_price, usage_condition, quantity_limit, stores(id, name, category, area, line_available, popular_with_japanese, address, business_hours, reservation_info)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const coupon = data as unknown as CouponDetail;
  const store = coupon.stores;
  const isLocked = coupon.member_only && !session?.user;

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
    <main className="mx-auto max-w-md px-6 py-10">
      <ViewTracker couponId={id} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {CategoryIcon && <CategoryIcon className="h-6 w-6" strokeWidth={2} />}
          </span>
          <div>
            <p className="flex items-center gap-1 text-xs text-muted">
              <span>
                {category?.ja}
              </span>
              <span>・</span>
              <span className="flex items-center gap-0.5">
                <AreaIcon className="h-3 w-3" />
                {area?.ja}
              </span>
              {coupon.member_only && (
                <span className="ml-1 flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                  <Lock className="h-2.5 w-2.5" />
                  会員限定
                </span>
              )}
            </p>
            <h1 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight">
              {store.name}
              {store.popular_with_japanese && (
                <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
                  <Flame className="h-2.5 w-2.5" />
                  日本人に人気
                </span>
              )}
            </h1>
            {avgRating !== null && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <Star className="h-3.5 w-3.5 text-primary" fill="currentColor" strokeWidth={0} />
                <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                <span>({reviews.length}件の口コミ)</span>
              </p>
            )}
          </div>
        </div>
        {session?.user && (
          <form action={toggleFavorite.bind(null, id)}>
            <button
              type="submit"
              aria-label="favorite"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                isFavorited
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <Heart className="h-5 w-5" fill={isFavorited ? "currentColor" : "none"} strokeWidth={2} />
            </button>
          </form>
        )}
      </div>

      {isLocked ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-8 text-center">
          <Lock className="h-6 w-6 text-primary" />
          <p className="font-bold text-primary">
            会員限定クーポンです
          </p>
          <p className="text-sm text-muted">
            無料会員登録すると、割引内容と使い方を確認できます。
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
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
      )}

      <div className="mt-6">
        {!session?.user ? (
          <Link
            href="/signup?utm_source=coupon_detail"
            className="block rounded-full btn-glossy px-4 py-3.5 text-center text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99]"
          >
            無料会員登録でクーポンをGET
          </Link>
        ) : alreadyIssued ? (
          <p className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3.5 text-center text-sm font-medium text-muted">
            <CheckCircle2 className="h-4 w-4 text-success" />
            発行済みのクーポンです
          </p>
        ) : isSoldOut ? (
          <p className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3.5 text-center text-sm font-medium text-muted">
            <Users className="h-4 w-4" />
            先着順の受付は終了しました
          </p>
        ) : (
          <form action={issueCoupon.bind(null, id)}>
            <button
              type="submit"
              className="btn-glossy w-full rounded-full px-4 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 active:scale-[0.99]"
            >
              このクーポンをGET
            </button>
          </form>
        )}
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
                          aria-label="delete review"
                          className="text-muted transition hover:text-primary"
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
