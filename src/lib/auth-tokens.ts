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
export async function consumeAuthToken(rawToken: string, type: AuthTokenType): Promise<string | null> {
  const { data: row } = await supabaseAdmin
    .from("auth_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", hashToken(rawToken))
    .eq("type", type)
    .maybeSingle();

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return null;

  await supabaseAdmin.from("auth_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);

  return row.user_id;
}
