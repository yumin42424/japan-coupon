import "server-only";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 별도 테이블 없이 기존 signup_attempts(ip text PK, attempt_count, first_attempt_at, locked_until)를
// "키 → 시도 횟수" 저장소로 재사용한다. 키 앞에 용도를 붙여서(예: "reset:ip:1.2.3.4") 서로 섞이지 않게 한다.
// Vercel은 x-forwarded-for를 실제 접속 IP로 덮어써서 내려주므로 클라이언트가 임의로 바꿀 수 없다.

export async function getClientIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

type Limit = { max: number; windowMs: number; lockMs: number };

// 이번 시도를 기록하고, 한도를 넘어 "차단 상태"이면 true를 반환한다.
export async function isRateLimited(key: string, limit: Limit): Promise<boolean> {
  const now = new Date();
  const { data: row } = await supabaseAdmin
    .from("signup_attempts")
    .select("attempt_count, first_attempt_at, locked_until")
    .eq("ip", key)
    .maybeSingle();

  if (row?.locked_until && new Date(row.locked_until) > now) return true;

  const windowExpired = !row || now.getTime() - new Date(row.first_attempt_at).getTime() > limit.windowMs;
  const attemptCount = windowExpired ? 1 : row.attempt_count + 1;

  await supabaseAdmin.from("signup_attempts").upsert({
    ip: key,
    attempt_count: attemptCount,
    first_attempt_at: windowExpired ? now.toISOString() : row.first_attempt_at,
    locked_until: attemptCount > limit.max ? new Date(now.getTime() + limit.lockMs).toISOString() : null,
  });

  return attemptCount > limit.max;
}
