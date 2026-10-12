import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

// 관리자 판정은 세션(JWT) 안의 이메일이 아니라 DB의 users.email 기준으로 한다.
// LINE처럼 프로바이더가 내려주는 이메일이 로그인 시점마다 바뀔 수 있는 경우에도
// 토큰 이메일만으로 관리자 권한이 생기지 않게 하기 위함.
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return false;

  const { data } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  return isAdminEmail(data?.email);
});

// 관리자 전용 Server Action은 반드시 맨 앞에서 이 함수를 호출해 자체적으로 권한을 확인해야 한다.
export async function requireAdmin() {
  if (!(await getIsAdmin())) {
    throw new Error("管理者権限が必要です。");
  }
}

// 관리자 페이지(Server Component)는 layout의 가드만 믿으면 안 된다 — layout과 page는 병렬로
// 렌더링되고, `RSC: 1` 요청에서는 layout이 redirect를 던져도 page가 읽은 데이터가 같은 응답
// 본문에 실려 나간다. 그래서 모든 관리자 page가 데이터를 읽기 "전에" 이 함수를 await 해야 한다.
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await getIsAdmin())) redirect("/");
}
