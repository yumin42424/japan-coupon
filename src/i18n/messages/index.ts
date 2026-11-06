import type { Locale } from "../config";
import type { Messages } from "../translate";
import de from "./de";
import en from "./en";
import es from "./es";
import fr from "./fr";
import id from "./id";
import ko from "./ko";
import pt from "./pt";
import ru from "./ru";
import th from "./th";
import vi from "./vi";
import zhCN from "./zh-CN";
import zhTW from "./zh-TW";

const MESSAGES: Partial<Record<Locale, Messages>> = {
  "de": de,
  "en": en,
  "es": es,
  "fr": fr,
  "id": id,
  "ko": ko,
  "pt": pt,
  "ru": ru,
  "th": th,
  "vi": vi,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

// 일본어는 키 자체가 원문이므로 번역표가 없다(null). 다른 언어는 그 언어의 표만 쓴다.
export function messagesFor(locale: Locale): Messages | null {
  return MESSAGES[locale] ?? null;
}
