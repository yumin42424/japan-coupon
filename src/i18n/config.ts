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

// 처음 온 방문자의 언어. IP 나라가 아니라 브라우저 언어로 정한다(한국에 와 있는 일본인 여행자에게 한국어가 뜨면 안 된다).
//   · 검색엔진·링크 미리보기 봇과 언어 정보가 없는 요청 → 일본어(검색 결과와 공유 미리보기가 일본어로 유지된다)
//   · 지원하지 않는 언어만 있는 브라우저 → 영어
const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|line-poker|lighthouse/i;

export function detectLocale(acceptLanguage: string | null | undefined, userAgent?: string | null): Locale {
  if (!acceptLanguage || (userAgent && BOT_PATTERN.test(userAgent))) return DEFAULT_LOCALE;
  const tags = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim(), weight: q ? Number(q.slice(2)) : 1, index };
    })
    .filter(({ tag, weight }) => tag && tag !== "*" && weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  if (tags.length === 0) return DEFAULT_LOCALE;
  for (const { tag } of tags) {
    const [primary, ...rest] = tag.split("-");
    if (primary === "zh") {
      return rest.some((part) => ["tw", "hk", "mo", "hant"].includes(part)) ? "zh-TW" : "zh-CN";
    }
    if (primary === "in") return "id";
    const found = LOCALES.find((locale) => locale === primary);
    if (found) return found;
  }
  return "en";
}

export function parseLocale(value: string | null | undefined): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}
