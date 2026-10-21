import "server-only";
import * as Sentry from "@sentry/nextjs";
import { mailReadiness, maskEmail, type MailReadiness } from "@/lib/email-config";

// Resend REST API를 직접 호출한다 (SDK 없이 fetch 한 번).
// 이 함수는 절대 예외를 던지지 않고, 호출하는 쪽이 "정말 보냈는지"를 알 수 있게 결과를 돌려준다.
// 실패하면 Sentry로 알린다 — 이전에는 console.error만 남겨서 메일이 한 통도 안 가도 아무도 몰랐다.
// 자동 재시도는 하지 않는다 (재시도하면 같은 메일이 두 번 갈 수 있음; 사용자가 직접 "再送"을 누르는 구조).
export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid_sender" | "rejected" | "network_error" };

const isProduction = () => process.env.NODE_ENV === "production";

// 환경변수만 보고 "지금 메일을 보낼 수 있는 설정인가"를 돌려준다 (네트워크 호출 없음).
// 비밀번호 재설정처럼 응답을 먼저 돌려주는 화면이, 설정이 안 된 상태에서 "보냈습니다"라고 말하지 않게 하는 데 쓴다.
export function getMailReadiness(): MailReadiness {
  return mailReadiness({
    apiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    production: isProduction(),
  });
}

let warnedSandboxSender = false;
const reportedNotReady = new Set<string>();

// 설정 문제는 모든 발송이 실패한다는 뜻이다. 같은 오류를 인스턴스당 한 번만 Sentry에 올려 알림이 쏟아지지 않게 한다.
export function reportMailNotReady(readiness: Extract<MailReadiness, { ready: false }>): void {
  if (reportedNotReady.has(readiness.reason)) return;
  reportedNotReady.add(readiness.reason);
  const why =
    readiness.reason === "no_api_key"
      ? "RESEND_API_KEY is not set"
      : readiness.reason === "no_sender"
        ? "EMAIL_FROM is not set (the Resend sandbox sender is not used in production)"
        : "EMAIL_FROM is malformed";
  if (isProduction()) {
    Sentry.captureMessage(`email: ${why}; mail will not be sent`, { level: "error", tags: { area: "email", reason: readiness.reason } });
  }
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const readiness = getMailReadiness();

  if (!readiness.ready) {
    reportMailNotReady(readiness);
    console.error(`[email] not sent (${readiness.reason}) to=${maskEmail(to)}`);
    return { ok: false, reason: readiness.reason === "invalid_sender" ? "invalid_sender" : "not_configured" };
  }

  if (isProduction() && readiness.isSandbox && !warnedSandboxSender) {
    // 운영자가 EMAIL_FROM에 샌드박스 주소를 명시한 상태 — 본인 주소 테스트용으로는 허용하지만 일반 이용자에게는 도착하지 않는다.
    warnedSandboxSender = true;
    Sentry.captureMessage(
      "email: EMAIL_FROM is the Resend sandbox address in production; only the Resend account owner can receive mail. Verify a domain and set EMAIL_FROM.",
      { level: "warning", tags: { area: "email" } }
    );
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: readiness.from, to, subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "email", kind: "network" } });
    console.error("[email] request failed:", err instanceof Error ? err.name : "unknown error");
    return { ok: false, reason: "network_error" };
  }

  if (!res.ok) {
    // 응답 본문에는 계정 소유자의 주소 같은 값이 들어올 수 있어서 통째로 기록하지 않고, 상태 코드와 오류 종류(name)만 남긴다.
    let name = "unknown";
    try {
      const body = (await res.json()) as { name?: unknown };
      if (typeof body.name === "string") name = body.name.slice(0, 60);
    } catch {
      // 본문이 JSON이 아니어도 상관없다
    }
    console.error(`[email] send rejected: status=${res.status} name=${name} to=${maskEmail(to)}`);
    Sentry.captureMessage(`email: Resend rejected the send (${res.status} ${name})`, {
      level: "error",
      tags: { area: "email", status: String(res.status) },
    });
    return { ok: false, reason: "rejected" };
  }

  return { ok: true };
}
