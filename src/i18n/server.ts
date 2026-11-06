import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALES, LOCALE_COOKIE, detectLocale, type Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";
import { translate, type TFunction } from "@/i18n/translate";

export const getLocale = cache(async (): Promise<Locale> => {
  // 직접 고른 언어가 최우선, 없으면 브라우저 언어를 따른다.
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (LOCALES.includes(chosen as Locale)) return chosen as Locale;
  const requestHeaders = await headers();
  return detectLocale(requestHeaders.get("accept-language"), requestHeaders.get("user-agent"));
});

// 서버 컴포넌트용: const t = await getT();
export async function getT(): Promise<TFunction> {
  const messages = messagesFor(await getLocale());
  return (key, params) => translate(messages, key, params);
}
