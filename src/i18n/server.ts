import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, type Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";
import { translate, type TFunction } from "@/i18n/translate";

export const getLocale = cache(async (): Promise<Locale> => {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
});

// 서버 컴포넌트용: const t = await getT();
export async function getT(): Promise<TFunction> {
  const messages = messagesFor(await getLocale());
  return (key, params) => translate(messages, key, params);
}
