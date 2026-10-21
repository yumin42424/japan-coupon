import "server-only";
import * as Sentry from "@sentry/nextjs";
import { maskEmail, resolveSender } from "@/lib/email-config";

// Resend REST API를 직접 호출한다 (SDK 없이 fetch 한 번).
// 이 함수는 절대 예외를 던지지 않고, 호출하는 쪽이 "정말 보냈는지"를 알 수 있게 결과를 돌려준다.
// 실패하면 Sentry로 알린다 — 이전에는 console.error만 남겨서 메일이 한 통도 안 가도 아무도 몰랐다.
// 자동 재시도는 하지 않는다 (재시도하면 같은 메일이 두 번 갈 수 있음; 사용자가 직접 "再送"을 누르는 구조).
export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid_sender" | "rejected" | "network_error" };

let warnedSandboxSender = false;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!apiKey) {
    if (isProduction) {
      Sentry.captureMessage("email: RESEND_API_KEY is not set, mail was not sent", { level: "error", tags: { area: "email" } });
    } else {
      console.log(`[email] RESEND_API_KEY未設定のため送信スキップ — to=${maskEmail(to)}`);
    }
    return { ok: false, reason: "not_configured" };
  }

  const sender = resolveSender(process.env.EMAIL_FROM);
  if (!sender.ok) {
    Sentry.captureMessage("email: EMAIL_FROM is malformed, mail was not sent", { level: "error", tags: { area: "email" } });
    console.error("[email] EMAIL_FROM has an invalid format");
    return { ok: false, reason: "invalid_sender" };
  }
  if (isProduction && sender.isSandbox && !warnedSandboxSender) {
    // 공용 샌드박스 주소로는 Resend 계정 소유자에게만 보낼 수 있다. 값이 비어 있는 상태로 운영 중이라는 사실을 한 번 알린다.
    warnedSandboxSender = true;
    Sentry.captureMessage(
      "email: sending from the Resend sandbox address in production; only the Resend account owner can receive mail. Verify a domain and set EMAIL_FROM.",
      { level: "warning", tags: { area: "email" } }
    );
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: sender.from, to, subject, html }),
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
