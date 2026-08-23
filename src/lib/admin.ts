import { auth } from "@/auth";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

// admin/layout.tsx의 페이지 진입 가드는 Server Action 호출까지는 막아주지 않으므로,
// 관리자 전용 Server Action은 반드시 맨 앞에서 이 함수를 호출해 자체적으로 권한을 확인해야 한다.
export async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    throw new Error("管理者権限が必要です。(관리자 권한이 필요합니다.)");
  }
}
