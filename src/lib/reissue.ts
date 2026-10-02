// 재사용 불가 쿠폰(기본값)은 항상 '0' — 기존 유니크 인덱스와 완전히 같은 동작을 유지한다.
// 재사용 가능 쿠폰은 N일 단위로 버킷을 나눠서, 버킷이 바뀌면 자연스럽게 재발급이 열린다.
export function computeReissueKey(reusableAfterDays: number | null | undefined, now: Date = new Date()): string {
  if (!reusableAfterDays || reusableAfterDays <= 0) return "0";
  const daysSinceEpoch = Math.floor(now.getTime() / 86400000);
  const bucket = Math.floor(daysSinceEpoch / reusableAfterDays);
  return String(bucket);
}
