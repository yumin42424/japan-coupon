import { getLocale, getT } from "@/i18n/server";

// 저장된 내용을 자동 번역해서 보여 줄 때 그 사실과 원문 우선 원칙을 알린다. 일본어 화면에는 나오지 않는다.
export async function AutoTranslatedNote({ boxed = false }: { boxed?: boolean }) {
  if ((await getLocale()) === "ja") return null;
  const t = await getT();
  const text = t("自動翻訳を含みます。内容に相違がある場合は日本語の原文が優先します。");
  if (boxed) {
    return (
      <p className="mb-6 rounded-lg border border-border bg-background-alt px-4 py-3 text-body text-foreground/80">
        {text}
      </p>
    );
  }
  return <p className="mt-3 text-caption text-muted">{text}</p>;
}
