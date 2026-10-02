import "server-only";

const CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? "";

// 사용자가 먼저 말을 걸어서 받는 reply API(웹훅)와 달리, 이건 우리가 먼저
// 보내는 push API — CRM성 알림(여행일 임박, 쿠폰 만료 임박, 관심지역 신규매장)에 쓴다.
export async function sendLinePush(lineUserId: string, messages: unknown[]): Promise<boolean> {
  if (!CHANNEL_ACCESS_TOKEN) return false;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });
  if (!res.ok) {
    console.error("[line-push] failed", res.status, await res.text());
    return false;
  }
  return true;
}

export function textMessage(text: string) {
  return { type: "text", text };
}
