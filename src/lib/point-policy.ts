// 포인트 정책 — 한 곳에서만 관리한다.
//
// 포인트 "적립"(쿠폰 사용 처리 시 10pt)은 이미 운영 중이지만, "사용처"는 사업적으로 아직 확정되지 않았다.
// 사용처를 임의로 만들어내지 않기 위해, 사용 기능은 이 파일에서 꺼 둔 상태로 출시하고
// 서버(usePoints 액션)와 UI가 모두 이 값을 따른다. 클라이언트가 보낸 값은 정책 판단에 쓰지 않는다.

// 쿠폰 사용 처리 시 적립되는 포인트
export const POINTS_PER_USE = 10;

// false로 바꾸면 마이페이지의 포인트 표시와 /mypage/points 화면이 모두 숨겨진다 (데이터는 그대로 보존).
export const POINT_UI_VISIBLE = true;

// 포인트 사용 기능 전체 스위치. 사용처(POINT_USE_OPTIONS)와 사용 조건이 확정되기 전에는 false로 둔다.
export const POINT_USE_ENABLED = false;

export type PointUseOption = {
  id: string;
  // 사용 내역에 남는 표기(일본어)
  label: string;
  description: string;
  // 차감 포인트. 반드시 여기(서버 정책)에서 가져온다 — 요청 금액 변조 방지.
  cost: number;
  enabled: boolean;
};

// 사용처가 확정되면 여기에만 추가한다. 지금은 비어 있어 어떤 사용 요청도 서버에서 거부된다.
export const POINT_USE_OPTIONS: readonly PointUseOption[] = [];

export function findPointUseOption(
  id: unknown,
  options: readonly PointUseOption[] = POINT_USE_OPTIONS
): PointUseOption | null {
  if (typeof id !== "string") return null;
  return options.find((o) => o.id === id) ?? null;
}

export function isPointUseAvailable(
  enabled: boolean = POINT_USE_ENABLED,
  options: readonly PointUseOption[] = POINT_USE_OPTIONS
): boolean {
  return enabled && options.some((o) => o.enabled);
}
