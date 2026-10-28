// 감사용 컬럼(예: coupon_events.redeemed_by)이 "아직 DB에 없는" 상태를 알아보는 판별 함수. 순수 함수라서 단위 테스트한다.
// 마이그레이션이 운영 DB에 적용되기 전에도 사용 처리가 멈추지 않도록, 이 오류일 때만 컬럼 없이 다시 시도한다.
//   PGRST204 = PostgREST: 쓰려는 컬럼이 스키마 캐시에 없음 (운영 DB에서 실제로 이 코드가 돌아오는 것을 확인함)
//   42703    = PostgreSQL undefined_column (읽기에서 같은 상황)
// 다른 오류(권한, 제약 위반, 네트워크)는 절대 "컬럼 없음"으로 취급하지 않는다.
export function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  column: string
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code !== "PGRST204" && code !== "42703") return false;
  return (error.message ?? "").includes(column);
}
