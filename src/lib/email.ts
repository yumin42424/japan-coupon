import "server-only";

// Resend REST API를 직접 호출한다 (SDK 없이 fetch 한 번). RESEND_API_KEY가 없으면
// 로컬 개발 등에서 발송 없이 콘솔에만 로그를 남기고 조용히 넘어간다.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "K-Coupon Japan <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY未設定のため送信スキップ — to=${to}, subject=${subject}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    console.error(`[email] send failed (${res.status}): ${await res.text()}`);
  }
}
