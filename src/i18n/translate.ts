// 번역 키는 일본어 원문 그대로다: t("クーポンを探す"). 코드를 읽기 쉽고, 번역이 없으면 일본어가 그대로 나온다.
// {name} 자리에는 params 값을 넣는다: t("{n}件のクーポン", { n: 3 })
export type Messages = Record<string, string>;
export type TFunction = (key: string | null | undefined, params?: Record<string, string | number>) => string;

export function translate(
  messages: Messages | null,
  key: string | null | undefined,
  params?: Record<string, string | number>
): string {
  if (key == null) return "";
  const template = messages?.[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
