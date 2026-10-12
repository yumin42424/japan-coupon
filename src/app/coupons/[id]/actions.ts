"use server";

import { todayKST } from "@/lib/date";
import * as Sentry from "@sentry/nextjs";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getIsAdmin } from "@/lib/admin";
import { computeReissueKey } from "@/lib/reissue";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 조회수는 매장 영업(B2B)에 쓰는 지표라서, 존재하지 않거나 비공개인 쿠폰 ID로 임의로 쌓지 못하게 한다.
export async function recordView(couponId: string) {
  if (typeof couponId !== "string" || !UUID_RE.test(couponId)) return;

  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("id, is_active, is_demo, valid_to, stores(is_active, is_demo)")
    .eq("id", couponId)
    .maybeSingle();
  const store = coupon?.stores as unknown as { is_active: boolean; is_demo: boolean } | null;
  if (!coupon || !coupon.is_active || coupon.is_demo || !store?.is_active || store.is_demo) return;
  if (coupon.valid_to < todayKST()) return;

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
    .select("valid_to, quantity_limit, is_active, is_demo, reusable_after_days, stores(is_active, is_demo)")
    .eq("id", couponId)
    .maybeSingle();

  if (!coupon) {
    notFound();
  }

  const store = coupon.stores as unknown as { is_active: boolean; is_demo: boolean } | null;
  if (!coupon.is_active || !store?.is_active || coupon.is_demo || store?.is_demo) {
    redirect(`/coupons/${couponId}`);
  }

  const today = todayKST();
  if (coupon.valid_to < today) {
    redirect(`/coupons/${couponId}`);
  }

  // 재사용 가능 쿠폰은 현재 period(reissueKey)에서 이미 받았는지만 본다 —
  // period가 바뀌면 자연스럽게 다시 GET할 수 있다. 재사용 불가(대부분)는 기존과 동일하게
  // "평생 한 번"을 reissueKey='0' 하나로 표현한다.
  const reissueKey = computeReissueKey(coupon.reusable_after_days);

  // 선착순 한도 확인 + 발급 기록을 DB 함수(issue_coupon) 한 번으로 처리한다. 쿠폰 행을 잠근 채 세고 기록하기 때문에
  // 동시에 몰려도 한도를 넘겨 발급되지도, 전원이 탈락하지도 않는다 (db/migrations/20261012_issue_coupon_atomic.sql).
  const { error: rpcError } = await supabaseAdmin.rpc("issue_coupon", {
    p_user_id: session.user.id,
    p_coupon_id: couponId,
    p_reissue_key: reissueKey,
  });
  if (!rpcError) {
    revalidatePath(`/coupons/${couponId}`);
    redirect(`/coupons/${couponId}`);
  }
  // PGRST202: 함수가 아직 DB에 없음(마이그레이션 적용 전) → 아래의 기존 방식으로 처리한다. 그 외 오류는 기록만 남기고 화면으로 돌려보낸다.
  if (rpcError.code !== "PGRST202") {
    Sentry.captureException(new Error(`issue_coupon failed (${rpcError.code ?? "no-code"}): ${rpcError.message}`));
    redirect(`/coupons/${couponId}`);
  }

  const { data: existingIssue } = await supabaseAdmin
    .from("coupon_events")
    .select("id")
    .eq("coupon_id", couponId)
    .eq("user_id", session.user.id)
    .eq("event_type", "issue")
    .eq("reissue_key", reissueKey)
    .maybeSingle();

  if (existingIssue) {
    redirect(`/coupons/${couponId}`);
  }

  if (coupon.quantity_limit != null) {
    const { count } = await supabaseAdmin
      .from("coupon_events")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", couponId)
      .eq("event_type", "issue");
    if ((count ?? 0) >= coupon.quantity_limit) {
      redirect(`/coupons/${couponId}`);
    }
  }

  // (DB 함수가 없는 동안의 임시 경로) 중복 발급은 DB 유니크 인덱스가 막아 준다.
  await supabaseAdmin.from("coupon_events").insert({
    coupon_id: couponId,
    user_id: session.user.id,
    event_type: "issue",
    reissue_key: reissueKey,
  });

  revalidatePath(`/coupons/${couponId}`);
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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// 클라이언트가 보낸 Content-Type만 믿지 않고, 파일 앞부분(매직 바이트)이 실제 JPEG/PNG/WebP인지 확인한다.
async function looksLikeAllowedImage(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isWebp =
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  return isJpeg || isPng || isWebp;
}
const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  if (body.length > 2000) {
    return { error: "口コミ内容は2000文字以内で入力してください。" };
  }

  const eligible = await hasUsedCouponAtStore(session.user.id, storeId);
  if (!eligible) {
    return { error: "クーポンを利用したお客様のみ口コミを投稿できます。" };
  }

  const photo = formData.get("photo");
  const payload: { store_id: string; user_id: string; rating: number; body: string; photo_url?: string } = {
    store_id: storeId,
    user_id: session.user.id,
    rating,
    body,
  };

  if (photo instanceof File && photo.size > 0) {
    const ext = ALLOWED_PHOTO_TYPES[photo.type];
    if (!ext) {
      return { error: "写真はJPEG・PNG・WebP形式のみ対応しています。" };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: "写真のサイズは5MB以内にしてください。" };
    }
    if (!(await looksLikeAllowedImage(photo))) {
      return { error: "写真はJPEG・PNG・WebP形式のみ対応しています。" };
    }
    const path = `${session.user.id}/${storeId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("review-photos")
      .upload(path, photo, { contentType: photo.type, upsert: false });
    if (uploadError) {
      return { error: "写真のアップロードに失敗しました。しばらくしてからもう一度お試しください。" };
    }
    const { data: publicUrlData } = supabaseAdmin.storage.from("review-photos").getPublicUrl(path);
    payload.photo_url = publicUrlData.publicUrl;
  }

  const { error } = await supabaseAdmin
    .from("reviews")
    .upsert(payload, { onConflict: "store_id,user_id" });

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
  if (review.user_id !== session.user.id && !(await getIsAdmin())) {
    return;
  }

  await supabaseAdmin.from("reviews").delete().eq("id", reviewId);
  revalidatePath(`/coupons/${couponId}`);
}
