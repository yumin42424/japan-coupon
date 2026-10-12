import "server-only";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AuthTokenType = "email_verify" | "password_reset";

const TTL_MINUTES: Record<AuthTokenType, number> = {
  email_verify: 60 * 24, // 24時間
  password_reset: 30,
};

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// メール内リンクに載せる生トークンを返す。DBにはハッシュのみ保存する
// (パスワードと同じ発想 — トークンが漏れてもDB内容だけでは再現できない)。
export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MINUTES[type] * 60 * 1000).toISOString();

  await supabaseAdmin.from("auth_tokens").insert({
    user_id: userId,
    type,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt,
  });

  return rawToken;
}

// 유효하면 해당 토큰을 사용 처리(1회용)하고 user_id를 반환, 아니면 null.
// "조회 후 갱신" 두 단계로 나누면 같은 링크를 동시에 두 번 열었을 때 둘 다 성공할 수 있어서,
// 조건(미사용 + 미만료)을 건 UPDATE 한 번으로 처리한다 — 동시에 와도 한쪽만 행을 갱신한다.
export async function consumeAuthToken(rawToken: string, type: AuthTokenType): Promise<string | null> {
  if (typeof rawToken !== "string" || rawToken.length < 32 || rawToken.length > 200) return null;

  const { data } = await supabaseAdmin
    .from("auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(rawToken))
    .eq("type", type)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();

  return data?.user_id ?? null;
}
