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

// 로그/오류 리포트에 수신자 주소가 그대로 남지 않게 한다: "taro@example.com" -> "t***@example.com"
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
