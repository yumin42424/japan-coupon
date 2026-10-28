// 쿠폰 사용 처리를 "누가 어느 매장 쿠폰에 대해" 할 수 있는지의 규칙. 순수 함수라서 단위 테스트한다.
//   · 관리자: 모든 매장의 쿠폰
//   · 매장 직원: 자기에게 연결된 매장(store_staff)의 쿠폰만
//   · 그 밖의 모든 경우(연결 없음, 쿠폰의 매장을 알 수 없음, 목록이 비어 있음)는 거절 — 판단이 애매하면 막는다
export type RedeemActor = {
  isAdmin: boolean;
  staffStoreIds: readonly string[];
};

export function canRedeemForStore(actor: RedeemActor, couponStoreId: string | null | undefined): boolean {
  if (actor.isAdmin) return true;
  if (!couponStoreId) return false;
  return actor.staffStoreIds.includes(couponStoreId);
}

// 직원이 자기 자신에게 발급된 쿠폰을 직접 사용 처리해 포인트를 쌓는 것을 막는다.
// 관리자는 테스트 계정으로 흐름을 확인해야 하므로 예외로 둔다.
export function isOwnCoupon(actor: RedeemActor, actorUserId: string, buyerUserId: string | null | undefined): boolean {
  return !actor.isAdmin && !!buyerUserId && actorUserId === buyerUserId;
}
