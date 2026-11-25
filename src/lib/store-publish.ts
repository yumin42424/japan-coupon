// 매장의 "새 매장" LINE 알림을 보낼지 정하는 규칙. 순수 함수라서 단위 테스트한다.
// - 손님이 볼 수 없는 매장(비공개·DEMO)으로는 알림을 보내지 않는다.
// - 등록과 동시에 공개하면 그때, 비공개로 등록했다가 나중에 공개하면 그때 한 번 보낸다.
// - 잠시 내렸다가 다시 공개할 때는, 손님이 이미 이 매장 쿠폰을 보거나 받은 기록(또는 후기)이 있으면
//   "새 매장"이 아니므로 다시 보내지 않는다. (조회 기록은 공개된 쿠폰에서만 남는다 — recordView 참고)
export function shouldAnnounceStore(input: {
  wasPublic: boolean;
  isPublic: boolean;
  isDemo: boolean;
  hasCustomerActivity: boolean;
}): boolean {
  if (!input.isPublic || input.isDemo) return false;
  if (input.wasPublic) return false;
  return !input.hasCustomerActivity;
}
