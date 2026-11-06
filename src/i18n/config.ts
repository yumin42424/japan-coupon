// 사이트 언어 설정. 언어는 쿠키에 저장한다(주소는 언어와 무관하게 그대로). 처음 방문하면 항상 일본어.
export const LOCALES = ["ja", "ko", "en", "zh-CN", "zh-TW", "th", "vi", "id", "es", "fr", "de", "pt", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";
export const LOCALE_COOKIE = "locale";

// 언어 메뉴에는 각 언어를 그 언어 자신의 이름으로 표시한다
export const LOCALE_NAMES: Record<Locale, string> = {
  ja: "日本語",
  ko: "한국어",
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  th: "ไทย",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
};

export function parseLocale(value: string | null | undefined): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}
