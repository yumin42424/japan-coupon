// 로그인/가입/온보딩 후 원래 페이지로 돌려보내는 callbackUrl은 사용자 입력(쿼리스트링/폼)으로
// 그대로 들어오기 때문에, 검증 없이 redirect()/signIn({redirectTo})에 넘기면 open redirect가 된다.
// 반드시 "/"로 시작하고 "//"(프로토콜 상대경로)나 "://"(절대 URL)가 아닌 내부 경로만 허용한다.
export function safeRedirectPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/"
): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("://")) return fallback;
  return value;
}
