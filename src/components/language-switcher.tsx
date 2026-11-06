"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Globe } from "lucide-react";
import { useLocale, useT } from "@/i18n/client";
import { setLocale } from "@/i18n/actions";
import { LOCALES, LOCALE_NAMES, DEFAULT_LOCALE } from "@/i18n/config";

// 헤더 오른쪽의 언어 선택. 고르면 쿠키에 저장하고 서버가 현재 페이지를 그 언어로 다시 그린다(주소는 그대로).
// 모바일에서는 공간이 좁아 지구본 아이콘만 보인다.
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: string) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(() => setLocale(next));
  };

  return (
    // 모바일에서는 버튼 위치가 언어마다 달라지므로 패널을 헤더 오른쪽 끝에 붙인다(그래야 화면 밖으로 나가지 않는다)
    <div ref={rootRef} className="shrink-0 md:relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${t("言語を選択")}: ${LOCALE_NAMES[locale]}`}
        className={`flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-card hover:text-foreground ${
          pending ? "opacity-60" : ""
        }`}
      >
        <Globe className="h-4 w-4 shrink-0" strokeWidth={2.1} aria-hidden="true" />
        <span className="hidden lg:inline">{LOCALE_NAMES[locale]}</span>
      </button>

      {open && (
        // 높이는 헤더와 하단 탭바를 뺀 만큼까지. 안내문이 길어도 목록만 스크롤되고 패널은 탭바에 가리지 않는다.
        <div className="absolute right-4 top-full z-30 mt-1 flex max-h-[calc(100dvh-8.5rem)] w-56 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-elevated sm:right-6 md:right-0 md:top-auto">
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {LOCALES.map((code) => {
              const active = code === locale;
              return (
                <li key={code}>
                  <button
                    type="button"
                    lang={code}
                    onClick={() => choose(code)}
                    aria-current={active ? "true" : undefined}
                    className={`lang-option flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-body transition-colors hover:bg-background ${
                      active ? "font-bold text-primary" : "text-foreground"
                    }`}
                  >
                    {LOCALE_NAMES[code]}
                    {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* 매장·쿠폰 정보는 자동 번역이고, 번역이 저장되기 전에는 일본어로 보인다 — 그 사실을 미리 알린다 */}
          {locale !== DEFAULT_LOCALE && (
            <p className="shrink-0 border-t border-border bg-background px-3.5 py-2.5 text-caption text-muted">
              {t("店舗・クーポンの情報や投稿は自動翻訳です。翻訳が届くまで日本語で表示される場合があります。")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
