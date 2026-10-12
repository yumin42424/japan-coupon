import {
  POINT_USE_ENABLED,
  POINT_USE_OPTIONS,
  findPointUseOption,
  isPointUseAvailable,
  type PointUseOption,
} from "./point-policy";

// 포인트 사용 요청의 "정책 검증" 부분만 따로 분리한 순수 함수.
// (로그인 확인과 DB 차감은 서버 액션/RPC가 맡고, 여기서는 요청 값과 정책만 본다 — 단위 테스트 가능하도록.)

export type PointUseResultStatus =
  | "success"
  | "already_processed"
  | "insufficient"
  | "disabled"
  | "option_unavailable"
  | "invalid_request"
  | "unauthenticated"
  | "error";

export type PointUseResult = {
  status: PointUseResultStatus;
  used?: number;
  balance?: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export type PointUseValidation =
  | { ok: true; option: PointUseOption; requestId: string; amount: number }
  | { ok: false; status: "disabled" | "invalid_request" | "option_unavailable" };

export function validatePointUseRequest(
  input: { optionId: unknown; requestId: unknown },
  policy: { enabled: boolean; options: readonly PointUseOption[] } = {
    enabled: POINT_USE_ENABLED,
    options: POINT_USE_OPTIONS,
  }
): PointUseValidation {
  // 사용처가 확정되기 전에는 어떤 요청도 처리하지 않는다.
  if (!isPointUseAvailable(policy.enabled, policy.options)) {
    return { ok: false, status: "disabled" };
  }
  if (!isValidRequestId(input.requestId)) {
    return { ok: false, status: "invalid_request" };
  }
  const option = findPointUseOption(input.optionId, policy.options);
  if (!option || !option.enabled) {
    return { ok: false, status: "option_unavailable" };
  }
  // 차감 금액은 정책에 정의된 값만 사용한다 (0 이하/비정수 정책이 들어와도 거부).
  if (!Number.isInteger(option.cost) || option.cost <= 0) {
    return { ok: false, status: "invalid_request" };
  }
  return { ok: true, option, requestId: input.requestId, amount: option.cost };
}

// DB 함수(use_points)의 응답을 화면용 결과로 변환한다.
export function mapRpcResult(raw: unknown): PointUseResult {
  if (!raw || typeof raw !== "object") return { status: "error" };
  const r = raw as { status?: unknown; used?: unknown; balance?: unknown };
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  switch (r.status) {
    case "ok":
      return { status: "success", used: num(r.used), balance: num(r.balance) };
    case "already_processed":
      return { status: "already_processed", used: num(r.used), balance: num(r.balance) };
    case "insufficient":
      return { status: "insufficient", balance: num(r.balance) };
    case "invalid_amount":
    case "invalid_request":
    case "request_conflict":
      return { status: "invalid_request" };
    default:
      return { status: "error" };
  }
}
