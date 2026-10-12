"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  validatePointUseRequest,
  mapRpcResult,
  isValidRequestId,
  type PointUseResult,
} from "@/lib/point-use";

// 포인트 사용 확정. 로그인한 사용자 ID는 서버 세션에서만 가져오고, 차감 금액은 서버 정책(point-policy.ts)에서만 정한다.
// 클라이언트가 보내는 값은 optionId와 requestId(중복 처리 방지용 ID)뿐이다.
export async function spendPoints(input: { optionId: string; requestId: string }): Promise<PointUseResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { status: "unauthenticated" };

  const validated = validatePointUseRequest({
    optionId: (input as { optionId?: unknown } | null)?.optionId,
    requestId: (input as { requestId?: unknown } | null)?.requestId,
  });
  if (!validated.ok) return { status: validated.status };

  // 잔액 확인 + 차감 + 내역 기록을 DB 함수 하나(한 트랜잭션)에서 처리한다 — db/migrations/20261012_point_use.sql
  const { data, error } = await supabaseAdmin.rpc("use_points", {
    p_user_id: userId,
    p_amount: validated.amount,
    p_purpose: validated.option.id,
    p_label: validated.option.label,
    p_request_id: validated.requestId,
  });

  if (error) {
    Sentry.captureException(new Error(`use_points failed (${error.code ?? "no-code"}): ${error.message}`));
    return { status: "error" };
  }

  return mapRpcResult(data);
}

export type PointUseCheck =
  | { known: true; applied: boolean; used?: number; balance?: number }
  | { known: false };

// 통신 오류 등으로 결과를 못 받았을 때, "이 요청이 실제로 처리됐는지"만 읽어서 알려준다 (아무것도 바꾸지 않음).
export async function checkPointUse(requestId: string): Promise<PointUseCheck> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !isValidRequestId(requestId)) return { known: false };

  const { data: row, error } = await supabaseAdmin
    .from("point_events")
    .select("points")
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) return { known: false };

  if (!row) return { known: true, applied: false };

  const { data: all } = await supabaseAdmin.from("point_events").select("points").eq("user_id", userId);
  const balance = (all ?? []).reduce((sum, r) => sum + (r.points as number), 0);
  return { known: true, applied: true, used: -(row.points as number), balance };
}
