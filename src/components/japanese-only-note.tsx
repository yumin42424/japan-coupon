import { getLocale, getT } from "@/i18n/server";

// 약관·개인정보처리방침은 법적 문서라 기계적으로 번역해 올리지 않는다(번역본은 검토 전까지 효력 문제가 생길 수 있음).
// 일본어가 아닌 언어를 고른 사람에게는 이 페이지가 일본어로만 제공된다는 사실을 그 사람의 언어로 알려준다.
export async function JapaneseOnlyNote() {
  if ((await getLocale()) === "ja") return null;
  const t = await getT();
  return (
    <p className="mb-6 rounded-lg border border-border bg-background-alt px-4 py-3 text-body text-foreground/80">
      {t("このページは日本語のみでご覧いただけます。")}
    </p>
  );
}
