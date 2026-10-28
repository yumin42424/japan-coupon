"use server";

import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminUser } from "@/lib/admin";
import { isMissingColumnError } from "@/lib/audit";
import { canRedeemForStore, isOwnCoupon, type RedeemActor } from "@/lib/redeem-access";
import { getRedeemActor } from "@/lib/staff";
import { todayKST } from "@/lib/date";
import { POINTS_PER_USE } from "@/lib/point-policy";

export type RedeemState = {
  step: "input" | "found" | "used" | "invalid" | "expired" | "unavailable" | "forbidden" | "own" | "done";
  issueEventId?: string;
  couponId?: string;
  userId?: string;
  reissueKey?: string;
  storeName?: string;
  couponTitle?: string;
  nickname?: string;
};

type IssueRow = {
  id: string;
  coupon_id: string;
  user_id: string | null;
  reissue_key: string;
  coupons: { title: string; store_id: string | null; valid_to: string; is_active: boolean; stores: { name: string; is_active: boolean } | null } | null;
  users: { nickname: string } | null;
};

let warnedMissingAuditColumn = false;
function warnMissingAuditColumn() {
  if (warnedMissingAuditColumn) return;
  warnedMissingAuditColumn = true;
  Sentry.captureMessage(
    "coupon_events.redeemed_by is missing: redemptions are recorded without the processing admin. Apply db/apply/apply-redeem-audit.sql.",
    { level: "warning", tags: { area: "redeem" } }
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 관리자 화면(/admin/redeem)용. 관리자는 모든 매장의 쿠폰을 처리할 수 있다.
export async function processRedeem(
  _prevState: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  // 처리한 관리자의 ID — 사용 기록에 "누가 처리했는가"를 남기는 데 쓴다.
  const adminId = await requireAdminUser();
  return runRedeem({ userId: adminId, actor: { isAdmin: true, staffStoreIds: [] } }, formData);
}

// 매장 직원 화면(/staff/redeem)용. 요청한 사람이 누구인지는 폼 값이 아니라 서버가 검증한 세션에서만 정한다.
// 관리자도 아니고 직원 연결도 없으면 거절하고, 직원은 자기 매장의 쿠폰만 처리할 수 있다(runRedeem 안에서 확인).
export async function processStaffRedeem(
  _prevState: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  const who = await getRedeemActor();
  if (!who) throw new Error("権限がありません。");
  return runRedeem(who, formData);
}

async function runRedeem(
  who: { userId: string; actor: RedeemActor },
  formData: FormData
): Promise<RedeemState> {
  const { userId: processedBy, actor } = who;

  const confirm = formData.get("confirm") === "true";

  if (confirm) {
    // 화면에서 넘어온 hidden 값(couponId/userId/reissueKey)은 믿지 않고, 발급 이벤트 ID 하나만 받아서
    // 나머지는 DB에서 다시 읽는다 — 서로 다른 쿠폰/회원 값이 섞여 들어와도 엉뚱한 사용 처리가 되지 않게.
    const issueEventId = String(formData.get("issueEventId") ?? "");
    if (!UUID_RE.test(issueEventId)) return { step: "invalid" };

    const { data: issueRow } = await supabaseAdmin
      .from("coupon_events")
      .select("id, coupon_id, user_id, reissue_key, coupons(store_id, valid_to, is_active, stores(is_active))")
      .eq("id", issueEventId)
      .eq("event_type", "issue")
      .maybeSingle();
    if (!issueRow || !issueRow.user_id) return { step: "invalid" };

    // 직원은 자기 매장의 쿠폰만 — 다른 사용 처리 검사보다 먼저, 그리고 쿠폰 정보는 하나도 돌려주지 않고 거절한다.
    const confirmCoupon = issueRow.coupons as unknown as {
      store_id: string | null;
      valid_to: string;
      is_active: boolean;
      stores: { is_active: boolean } | null;
    } | null;
    if (!canRedeemForStore(actor, confirmCoupon?.store_id)) return { step: "forbidden" };
    if (isOwnCoupon(actor, processedBy, issueRow.user_id)) return { step: "own" };

    const couponId = issueRow.coupon_id;
    const userId = issueRow.user_id;
    const reissueKey = issueRow.reissue_key || "0";

    // 재확인: 그 사이 다른 관리자가 먼저 처리했을 수도 있으니 마지막에 한 번 더 체크
    // (재사용 가능 쿠폰은 같은 period 안에서만 "이미 사용됨"으로 본다)
    const { data: existingUse } = await supabaseAdmin
      .from("coupon_events")
      .select("id")
      .eq("coupon_id", couponId)
      .eq("user_id", userId)
      .eq("event_type", "use")
      .eq("reissue_key", reissueKey)
      .maybeSingle();
    if (existingUse) return { step: "used" };

    // 재확인: 대기하는 사이 유효기간이 지났거나 일시중지됐을 수도 있으니 마지막에 한 번 더 체크
    const couponRow = confirmCoupon;
    if (couponRow && couponRow.valid_to < todayKST()) {
      return { step: "expired" };
    }
    if (couponRow && (!couponRow.is_active || !couponRow.stores?.is_active)) {
      return { step: "unavailable" };
    }

    // 사용 기록은 (회원, 쿠폰, 사이클) 부분 유니크 인덱스가 최종 방어선이다. 동시에 두 번 처리되면
    // 한쪽 insert가 실패하는데, 그때는 포인트도 주지 않아야 한다(이전엔 insert 결과를 무시해서 포인트가 두 번 적립될 수 있었음).
    const useRow = {
      coupon_id: couponId,
      user_id: userId,
      event_type: "use",
      reissue_key: reissueKey,
    };
    // redeemed_by(처리한 관리자)는 db/migrations/20261028_redeem_audit.sql 로 추가되는 컬럼이다.
    // 아직 운영 DB에 적용되지 않았으면(컬럼 없음 오류일 때만) 컬럼 없이 다시 시도해서 사용 처리 자체는 멈추지 않게 한다.
    let { error: useError } = await supabaseAdmin.from("coupon_events").insert({ ...useRow, redeemed_by: processedBy });
    if (isMissingColumnError(useError, "redeemed_by")) {
      warnMissingAuditColumn();
      ({ error: useError } = await supabaseAdmin.from("coupon_events").insert(useRow));
    }
    if (useError) {
      if (useError.code === "23505") return { step: "used" };
      Sentry.captureException(new Error(`redeem: use event insert failed (${useError.code})`));
      return { step: "invalid" };
    }

    // 쿠폰 사용 시 포인트 적립
    const { error: pointError } = await supabaseAdmin.from("point_events").insert({
      user_id: userId,
      points: POINTS_PER_USE,
      reason: "クーポン利用",
      coupon_id: couponId,
    });
    if (pointError) {
      // 사용 처리 자체는 이미 끝났으므로 실패로 돌려보내지 않고, 운영자가 알 수 있게 기록만 남긴다.
      Sentry.captureException(new Error(`redeem: point award failed (${pointError.code}) for issue ${issueEventId}`));
    }

    return { step: "done" };
  }

  const code = (formData.get("code") as string)?.trim();
  if (!code) return { step: "input" };
  if (!UUID_RE.test(code)) return { step: "invalid" };

  const { data: issueRow } = await supabaseAdmin
    .from("coupon_events")
    .select("id, coupon_id, user_id, reissue_key, coupons(title, store_id, valid_to, is_active, stores(name, is_active)), users(nickname)")
    .eq("id", code)
    .eq("event_type", "issue")
    .maybeSingle();

  const issue = issueRow as unknown as IssueRow | null;
  if (!issue || !issue.user_id) return { step: "invalid" };

  // 직원은 자기 매장의 쿠폰만 조회할 수 있다. 다른 매장의 쿠폰이면 제목·회원·상태를 알려주지 않는다.
  if (!canRedeemForStore(actor, issue.coupons?.store_id)) return { step: "forbidden" };
  if (isOwnCoupon(actor, processedBy, issue.user_id)) return { step: "own" };

  if (issue.coupons && issue.coupons.valid_to < todayKST()) {
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
    .eq("reissue_key", issue.reissue_key)
    .maybeSingle();

  if (useRow) return { step: "used" };

  return {
    step: "found",
    issueEventId: issue.id,
    couponId: issue.coupon_id,
    userId: issue.user_id,
    reissueKey: issue.reissue_key,
    storeName: issue.coupons?.stores?.name,
    couponTitle: issue.coupons?.title,
    nickname: issue.users?.nickname,
  };
}
