"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { isActivePath } from "@/components/nav-link";
import { useT } from "@/i18n/client";

const PRIMARY_LINKS = [
  { href: "/coupons", ja: "クーポンを探す" },
  { href: "/nearby", ja: "現在地から探す" },
  { href: "/ranking", ja: "おすすめ" },
  { href: "/guide", ja: "初めての方へ" },
  { href: "/notices", ja: "お知らせ" },
  { href: "/board", ja: "韓国旅行Q&A" },
];

const SECONDARY_LINKS = [
  { href: "/about", ja: "K-Coupon Japanについて" },
  { href: "/partnership", ja: "店舗の方へ" },
  { href: "/support", ja: "お問い合わせ" },
  { href: "/terms", ja: "利用規約" },
  { href: "/privacy", ja: "プライバシーポリシー" },
];

const noopSubscribe = () => () => {};

// 헤더·탭바에 다 못 넣는 페이지(이용 안내·공지·Q&A 등)로 가는 "メニュー".
//   · variant="tab": 모바일 하단 탭바의 한 칸
//   · variant="header": 태블릿 폭(md~xl) 헤더의 버튼 — 이 폭에서는 탭바가 없고 헤더 메뉴도 일부만 보이기 때문
// 아래에서 올라오는 패널 — Esc / 배경 터치 / 닫기 버튼 / 링크 선택으로 닫히고, 열면 패널 안으로, 닫으면 버튼으로 포커스가 돌아간다.
// 패널은 body 에 그린다: 헤더처럼 배경 블러(backdrop-filter)가 걸린 부모 안에 두면 fixed 위치의 기준이 그 부모로 바뀌어 버린다.
export function MobileMenu({ variant }: { variant: "tab" | "header" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 서버 렌더링과 첫 하이드레이션에서는 포털을 그리지 않는다 (document 가 없음 / 마크업 불일치 방지)
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      button?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  const panel = (
    <>
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-foreground/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        id={panelId}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("メニュー")}
        inert={!open}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] max-w-xl overflow-y-auto rounded-t-xl bg-background pb-[calc(1rem+env(safe-area-inset-bottom))] duration-200 ease-out ${
          // 열 때는 바로 보이게(그래야 패널 안으로 포커스를 옮길 수 있다), 닫을 때는 내려가는 동안만 보이게 한다
          open ? "visible translate-y-0 transition-transform" : "invisible translate-y-full transition-[transform,visibility]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-2">
          <p className="text-h3">{t("メニュー")}</p>
          <button
            type="button"
            onClick={close}
            aria-label={t("メニューを閉じる")}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label={t("すべてのページ")} className="px-5 py-2">
          <ul className="divide-y divide-border">
            {PRIMARY_LINKS.map((l) => {
              const active = isActivePath(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`block py-3.5 text-body font-bold ${active ? "text-primary" : "text-foreground"}`}
                  >
                    {t(l.ja)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 border-t border-border pt-3">
            {SECONDARY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="block py-2.5 text-caption text-muted">
                  {t(l.ja)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        data-menu-button={variant}
        className={
          variant === "tab"
            ? "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-xs font-medium text-foreground/60 transition active:bg-card"
            : "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 font-medium text-foreground/70 transition-colors hover:bg-card hover:text-foreground"
        }
      >
        <Menu className={variant === "tab" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.1} aria-hidden="true" />
        {t("メニュー")}
      </button>
      {isClient && createPortal(panel, document.body)}
    </>
  );
}
