// issueCoupon()이 DB 함수 issue_coupon()의 결과를 보고 "무엇을 할지" 정하는 규칙. 순수 함수라서 단위 테스트한다.
// 핵심 안전장치: 함수가 DB에 없을 때(마이그레이션 미적용) 수량 제한 쿠폰은 절대 예비 경로로 발급하지 않는다.
// 예비 경로는 "세고 나서 넣는" 방식이라 동시 요청에서 한도를 넘길 수 있기 때문이다.

export const MISSING_FUNCTION_CODE = "PGRST202"; // PostgREST: 호출한 함수를 찾을 수 없음 (운영 DB에서 실제로 이 코드가 돌아오는 것을 확인함)

export type IssueDecision =
  | "done" // 함수가 성공(ok / already_issued / sold_out 등 — 어느 쪽이든 화면은 상세 페이지로 돌아간다)
  | "failed" // 함수는 있지만 오류가 났다 → 발급하지 않고 기록한다
  | "blocked_missing_function" // 함수 없음 + 수량 제한 쿠폰 → 발급하지 않고 안내·알림한다
  | "legacy_path"; // 함수 없음 + 수량 제한 없음 → 중복 발급만 막으면 되므로 기존 방식(유니크 인덱스가 방어)

export function decideIssuePath(
  rpcError: { code?: string | null } | null | undefined,
  quantityLimit: number | null | undefined
): IssueDecision {
  if (!rpcError) return "done";
  if (rpcError.code !== MISSING_FUNCTION_CODE) return "failed";
  return quantityLimit != null ? "blocked_missing_function" : "legacy_path";
}
