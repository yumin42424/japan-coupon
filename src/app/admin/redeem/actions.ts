"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

const POINTS_PER_USE = 10;

export type RedeemState = {
  step: "input" | "found" | "used" | "invalid" | "done";
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
  coupons: { title: string; stores: { name: string } | null } | null;
  users: { nickname: string } | null;
};

export async function processRedeem(
  _prevState: RedeemState,
  formData: FormData
): Promise<RedeemState> {
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
    .select("id, coupon_id, user_id, coupons(title, stores(name)), users(nickname)")
    .eq("id", code)
    .eq("event_type", "issue")
    .maybeSingle();

  const issue = issueRow as unknown as IssueRow | null;
  if (!issue || !issue.user_id) return { step: "invalid" };

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
