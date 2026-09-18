"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

const POINTS_PER_USE = 10;

export type RedeemState = {
  step: "input" | "found" | "used" | "invalid" | "expired" | "unavailable" | "done";
  issueEventId?: string;
  couponId?: string;
  userId?: string;
  storeName?: string;
  couponTitle?: string;
  nickname?: string;
};

type IssueRow = {
  id: string;
  coupon_id: string;
  user_id: string | null;
  coupons: { title: string; valid_to: string; is_active: boolean; stores: { name: string; is_active: boolean } | null } | null;
  users: { nickname: string } | null;
};

export async function processRedeem(
  _prevState: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  await requireAdmin();

  const confirm = formData.get("confirm") === "true";

  if (confirm) {
    const issueEventId = formData.get("issueEventId") as string;
    const couponId = formData.get("couponId") as string;
    const userId = formData.get("userId") as string;
    if (!issueEventId || !couponId || !userId) return { step: "invalid" };

    // 재확인: 그 사이 다른 관리자가 먼저 처리했을 수도 있으니 마지막에 한 번 더 체크
    const { data: existingUse } = await supabaseAdmin
      .from("coupon_events")
      .select("id")
      .eq("coupon_id", couponId)
      .eq("user_id", userId)
      .eq("event_type", "use")
      .maybeSingle();
    if (existingUse) return { step: "used" };

    // 재확인: 대기하는 사이 유효기간이 지났거나 일시중지됐을 수도 있으니 마지막에 한 번 더 체크
    const { data: couponRow } = await supabaseAdmin
      .from("coupons")
      .select("valid_to, is_active, stores(is_active)")
      .eq("id", couponId)
      .maybeSingle();
    if (couponRow && couponRow.valid_to < new Date().toISOString().slice(0, 10)) {
      return { step: "expired" };
    }
    const redeemStore = couponRow?.stores as unknown as { is_active: boolean } | null;
    if (couponRow && (!couponRow.is_active || !redeemStore?.is_active)) {
      return { step: "unavailable" };
    }

    await supabaseAdmin.from("coupon_events").insert({
      coupon_id: couponId,
      user_id: userId,
      event_type: "use",
    });

    // 쿠폰 사용 시 포인트 적립
    await supabaseAdmin.from("point_events").insert({
      user_id: userId,
      points: POINTS_PER_USE,
      reason: "クーポン利用",
      coupon_id: couponId,
    });

    return { step: "done" };
  }

  const code = (formData.get("code") as string)?.trim();
  if (!code) return { step: "input" };

  const { data: issueRow } = await supabaseAdmin
    .from("coupon_events")
    .select("id, coupon_id, user_id, coupons(title, valid_to, is_active, stores(name, is_active)), users(nickname)")
    .eq("id", code)
    .eq("event_type", "issue")
    .maybeSingle();

  const issue = issueRow as unknown as IssueRow | null;
  if (!issue || !issue.user_id) return { step: "invalid" };

  if (issue.coupons && issue.coupons.valid_to < new Date().toISOString().slice(0, 10)) {
    return { step: "expired" };
  }

  if (issue.coupons && (!issue.coupons.is_active || !issue.coupons.stores?.is_active)) {
    return { step: "unavailable" };
  }

  const { data: useRow } = await supabaseAdmin
    .from("coupon_events")
    .select("id")
    .eq("coupon_id", issue.coupon_id)
    .eq("user_id", issue.user_id)
    .eq("event_type", "use")
    .maybeSingle();

  if (useRow) return { step: "used" };

  return {
    step: "found",
    issueEventId: issue.id,
    couponId: issue.coupon_id,
    userId: issue.user_id,
    storeName: issue.coupons?.stores?.name,
    couponTitle: issue.coupons?.title,
    nickname: issue.users?.nickname,
  };
}
