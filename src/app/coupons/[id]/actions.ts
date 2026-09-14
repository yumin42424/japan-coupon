"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/admin";

export async function recordView(couponId: string) {
  const session = await auth();
  await supabaseAdmin.from("coupon_events").insert({
    coupon_id: couponId,
    user_id: session?.user?.id ?? null,
    event_type: "view",
  });
}

export async function issueCoupon(couponId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/coupons/${couponId}`)}`);
  }

  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("quantity_limit")
    .eq("id", couponId)
    .maybeSingle();

  if (coupon?.quantity_limit != null) {
    const { count } = await supabaseAdmin
      .from("coupon_events")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", couponId)
      .eq("event_type", "issue");
    if ((count ?? 0) >= coupon.quantity_limit) {
      redirect(`/coupons/${couponId}`);
    }
  }

  await supabaseAdmin.from("coupon_events").insert({
    coupon_id: couponId,
    user_id: session.user.id,
    event_type: "issue",
  });

  redirect(`/coupons/${couponId}`);
}

export async function toggleFavorite(couponId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  // favorite은 view/issue/use처럼 쌓이는 로그가 아니라 "찜 여부"라는 상태라서,
  // 행이 있으면 지우고 없으면 만드는 토글로 구현한다.
  const { data: existing } = await supabaseAdmin
    .from("coupon_events")
    .select("id")
    .eq("coupon_id", couponId)
    .eq("user_id", userId)
    .eq("event_type", "favorite")
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("coupon_events").delete().eq("id", existing.id);
  } else {
    await supabaseAdmin.from("coupon_events").insert({
      coupon_id: couponId,
      user_id: userId,
      event_type: "favorite",
    });
  }

  revalidatePath(`/coupons/${couponId}`);
  revalidatePath("/mypage");
}

export type ReviewState = { error?: string };

// 리뷰는 실제로 그 매장 쿠폰을 사용(use)한 회원만 남길 수 있게 제한한다 —
// 광고성/미방문 리뷰를 막아서 "일본인이 실제로 방문했다"는 신뢰도를 지키기 위함.
async function hasUsedCouponAtStore(userId: string, storeId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("coupon_events")
    .select("id, coupons!inner(store_id)")
    .eq("user_id", userId)
    .eq("event_type", "use")
    .eq("coupons.store_id", storeId)
    .limit(1);
  return !!data && data.length > 0;
}

export async function submitReview(
  storeId: string,
  couponId: string,
  _prevState: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "評価を選択してください。" };
  }
  if (!body) {
    return { error: "口コミ内容を入力してください。" };
  }

  const eligible = await hasUsedCouponAtStore(session.user.id, storeId);
  if (!eligible) {
    return { error: "クーポンを利用したお客様のみ口コミを投稿できます。" };
  }

  const { error } = await supabaseAdmin
    .from("reviews")
    .upsert(
      { store_id: storeId, user_id: session.user.id, rating, body },
      { onConflict: "store_id,user_id" }
    );

  if (error) {
    return { error: "口コミの投稿に失敗しました。しばらくしてからもう一度お試しください。" };
  }

  revalidatePath(`/coupons/${couponId}`);
  return {};
}

export async function deleteReview(reviewId: string, couponId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { data: review } = await supabaseAdmin
    .from("reviews")
    .select("user_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (!review) return;
  if (review.user_id !== session.user.id && !isAdminEmail(session.user.email)) {
    return;
  }

  await supabaseAdmin.from("reviews").delete().eq("id", reviewId);
  revalidatePath(`/coupons/${couponId}`);
}
