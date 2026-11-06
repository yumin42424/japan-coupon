"use client";

import { createContext, useCallback, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { translate, type Messages, type TFunction } from "@/i18n/translate";

const I18nContext = createContext<{ locale: Locale; messages: Messages | null }>({
  locale: DEFAULT_LOCALE,
  messages: null,
});

// 루트 레이아웃이 현재 언어의 번역만 내려준다. 일본어면 messages 는 null 이라 페이지에 아무것도 추가되지 않는다.
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages | null;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

// 클라이언트 컴포넌트용: const t = useT();
export function useT(): TFunction {
  const { messages } = useContext(I18nContext);
  return useCallback<TFunction>((key, params) => translate(messages, key, params), [messages]);
}
