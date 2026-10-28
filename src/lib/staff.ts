import "server-only";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";
import { getIsAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { RedeemActor } from "@/lib/redeem-access";

// 이 회원이 직원으로 연결된 매장 ID 목록. 로그인한 회원의 ID(서버가 검증한 세션 값)로만 조회한다.
// 실패하면 항상 "직원 아님"(빈 목록)으로 돌려준다 — 권한은 애매할 때 주지 않는다.
//   · PGRST205 / 42P01: store_staff 테이블이 아직 DB에 없음(마이그레이션 적용 전). 정상 상황이라 알림 없이 빈 목록.
//     (PGRST205 는 운영 DB에서 실제로 돌아오는 것을 확인했다.)
//   · 그 밖의 오류: 빈 목록으로 막고 Sentry 에 남긴다.
export async function getStaffStoreIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("store_staff").select("store_id").eq("user_id", userId);
  if (error) {
    if (error.code !== "PGRST205" && error.code !== "42P01") {
      Sentry.captureException(new Error(`staff lookup failed (${error.code ?? "no-code"})`));
    }
    return [];
  }
  return (data ?? []).map((row) => row.store_id as string);
}

// 쿠폰 사용 처리 화면/액션이 쓰는 "지금 요청한 사람". 서버가 검증한 세션에서만 만들고, 폼 값은 쓰지 않는다.
//   · 로그인하지 않았거나, 관리자도 아니고 직원 연결도 없으면 null (화면은 404, 액션은 거절)
export async function getRedeemActor(): Promise<{ userId: string; actor: RedeemActor } | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const [isAdmin, staffStoreIds] = await Promise.all([getIsAdmin(), getStaffStoreIds(userId)]);
  if (!isAdmin && staffStoreIds.length === 0) return null;
  return { userId, actor: { isAdmin, staffStoreIds } };
}
