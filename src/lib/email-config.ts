// 메일 발신 주소 해석/검증과 로그용 마스킹. server-only 코드(email.ts)와 분리해 둔 순수 함수라서 단위 테스트할 수 있다.

// Resend가 인증 없이 쓰게 해 주는 공용 발신 주소. Resend 계정 소유자 본인에게만 발송할 수 있다.
export const SANDBOX_SENDER = "K-Coupon Japan <onboarding@resend.dev>";
const SANDBOX_DOMAIN = "resend.dev";

const ADDRESS_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)$/;
// "표시 이름 <주소>" 형태. 표시 이름에는 따옴표·꺾쇠·개행을 허용하지 않는다(헤더 주입 방지).
const NAMED_RE = /^([^<>"\r\n]{1,80}?)\s*<([^<>\s]+)>$/;

export type SenderInfo =
  | { ok: true; from: string; domain: string; isSandbox: boolean; configured: boolean }
  | { ok: false };

// EMAIL_FROM 값을 해석한다. 비어 있으면 공용(샌드박스) 주소로 대체하되 configured=false로 표시해서
// 호출하는 쪽이 "인증된 도메인으로 설정되지 않았다"는 사실을 알 수 있게 한다. 형식이 잘못됐으면 ok=false.
export function resolveSender(raw: string | undefined | null): SenderInfo {
  const value = (raw ?? "").trim();
  if (!value) {
    return { ok: true, from: SANDBOX_SENDER, domain: SANDBOX_DOMAIN, isSandbox: true, configured: false };
  }

  const named = NAMED_RE.exec(value);
  const address = named ? named[2] : value;
  const m = ADDRESS_RE.exec(address);
  if (!m) return { ok: false };

  const domain = m[1].toLowerCase();
  return { ok: true, from: value, domain, isSandbox: domain === SANDBOX_DOMAIN, configured: true };
}

export type MailReadiness =
  | { ready: true; from: string; isSandbox: boolean }
  | { ready: false; reason: "no_api_key" | "no_sender" | "invalid_sender" };

// 메일을 "실제로 보낼 수 있는 상태"인지 판단한다.
// - 운영(production)에서는 EMAIL_FROM이 비어 있으면 공용 샌드박스 주소로 조용히 대체하지 않는다.
//   그 주소는 Resend 계정 소유자에게만 보낼 수 있어서, 일반 이용자에게는 도착하지 않는 메일을 "보냈다"고 착각하게 만든다.
// - 운영자가 EMAIL_FROM에 샌드박스 주소를 명시적으로 넣은 경우(본인 주소로 테스트)는 허용하고 isSandbox로 표시한다.
// - 개발/테스트 환경에서만 빈 값이 샌드박스 주소로 대체된다.
export function mailReadiness(input: {
  apiKey: string | undefined | null;
  emailFrom: string | undefined | null;
  production: boolean;
}): MailReadiness {
  if (!(input.apiKey ?? "").trim()) return { ready: false, reason: "no_api_key" };

  const sender = resolveSender(input.emailFrom);
  if (!sender.ok) return { ready: false, reason: "invalid_sender" };
  if (input.production && !sender.configured) return { ready: false, reason: "no_sender" };

  return { ready: true, from: sender.from, isSandbox: sender.isSandbox };
}

// 로그/오류 리포트에 수신자 주소가 그대로 남지 않게 한다: "taro@example.com" -> "t***@example.com"
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
