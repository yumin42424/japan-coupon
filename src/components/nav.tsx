import Link from "next/link";
import { Home, Ticket, User, Shield, LogIn, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { getIsAdmin } from "@/lib/admin";
import { ScrollHeader } from "@/components/scroll-header";
import { NavLink } from "@/components/nav-link";
import { MobileMenu } from "@/components/mobile-menu";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/i18n/server";

const MENU_ITEM = "shrink-0 whitespace-nowrap rounded-lg px-2.5 py-2 transition-colors hover:bg-card lg:px-3";
const MENU_ACTIVE = "font-bold text-foreground";
const MENU_INACTIVE = "font-medium text-foreground/70 hover:text-foreground";

export async function Nav() {
  const t = await getT();
  const session = await auth();
  const isAdmin = await getIsAdmin();

  return (
    <>
      <ScrollHeader>
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link
            href="/"
            className="shrink-0 py-1.5 text-lg font-extrabold tracking-tight text-foreground transition hover:opacity-80"
          >
            K-Coupon <span className="text-primary">Japan</span>
          </Link>

          {/* 데스크탑 중앙 내비 — 로고/우측 액션 사이에 남는 공간을 채워서 오른쪽으로 쏠리지 않게 가운데 정렬 */}
          <nav aria-label={t("メインメニュー")} className="hidden flex-1 items-center justify-center gap-0.5 text-sm md:flex">
            <NavLink href="/coupons" className={MENU_ITEM} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
              {t("クーポン")}
            </NavLink>
            <NavLink href="/nearby" className={`hidden xl:block ${MENU_ITEM}`} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
              {t("現在地から")}
            </NavLink>
            <NavLink href="/ranking" className={`hidden xl:block ${MENU_ITEM}`} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
              {t("おすすめ")}
            </NavLink>
            <NavLink href="/guide" className={`hidden xl:block ${MENU_ITEM}`} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
              {t("初めての方へ")}
            </NavLink>
            <NavLink href="/notices" className={`hidden xl:block ${MENU_ITEM}`} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
              {t("お知らせ")}
            </NavLink>
            <NavLink href="/board" className={MENU_ITEM} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
              Q&amp;A
            </NavLink>
            {/* 태블릿 폭: 위에서 숨긴 메뉴(現在地・おすすめ・初めての方へ・お知らせ)와 안내 페이지로 가는 길 */}
            <div className="xl:hidden">
              <MobileMenu variant="header" />
            </div>
          </nav>

          {/* 데스크탑 우측 액션 (로그인/가입 또는 마이페이지/유저) — 항상 오른쪽 끝에 고정 */}
          <div className="hidden shrink-0 items-center gap-0.5 text-sm md:flex">
            <LanguageSwitcher />
            {session?.user ? (
              <>
                <NavLink href="/mypage" className={MENU_ITEM} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
                  {t("マイページ")}
                </NavLink>
                {isAdmin && (
                  <NavLink href="/admin" className={`flex items-center gap-1.5 ${MENU_ITEM}`} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
                    <Shield className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                    <span className="hidden lg:inline">{t("管理者")}</span>
                    <span className="sr-only lg:hidden">{t("管理者")}</span>
                  </NavLink>
                )}
                <span className="ml-1 hidden max-w-[9rem] truncate rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-muted lg:block">
                  {session.user.name}
                </span>
              </>
            ) : (
              <>
                <NavLink href="/login" className={MENU_ITEM} activeClassName={MENU_ACTIVE} inactiveClassName={MENU_INACTIVE}>
                  {t("ログイン")}
                </NavLink>
                <Link
                  href="/signup"
                  className="btn-glossy ml-1 shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 font-medium text-primary-foreground lg:px-4"
                >
                  {t("無料会員登録")}
                </Link>
              </>
            )}
          </div>

          {/* 모바일: 로그인 상태만 압축해서 표시, 나머지는 하단 탭바가 담당 */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            {session?.user ? (
              <span className="max-w-[7rem] truncate text-xs font-medium text-muted">
                {session.user.name}
              </span>
            ) : (
              <Link
                href="/signup"
                className="btn-glossy rounded-lg px-3.5 py-2 text-caption font-bold text-primary-foreground"
              >
                {t("無料登録")}
              </Link>
            )}
          </div>
        </div>
      </ScrollHeader>

      {/* 모바일 전용 하단 탭바 — 높이를 --bottom-nav-h 하나로 고정해서
          body의 여백/쿠폰상세 sticky CTA와 항상 같은 기준으로 맞물리게 한다.
          (배경 블러는 쓰지 않는다 — 블러가 있으면 안에서 여는 메뉴 패널의 고정 위치 기준이 탭바로 바뀐다) */}
      <nav
        aria-label={t("タブメニュー")}
        className="fixed inset-x-0 bottom-0 z-10 flex items-stretch border-t border-border bg-background md:hidden"
        style={{ height: "var(--bottom-nav-h)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-stretch justify-around px-2">
          <TabItem href="/" icon={Home} label={t("ホーム")} />
          <TabItem href="/coupons" icon={Ticket} label={t("クーポン")} />
          <TabItem href="/ranking" icon={Trophy} label={t("おすすめ")} />
          {session?.user ? (
            <TabItem href="/mypage" icon={User} label={t("マイページ")} />
          ) : (
            <TabItem href="/login" icon={LogIn} label={t("ログイン")} />
          )}
          {isAdmin && <TabItem href="/admin" icon={Shield} label={t("管理者")} />}
          <MobileMenu variant="tab" />
        </div>
      </nav>
    </>
  );
}

function TabItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <NavLink
      href={href}
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-xs font-medium transition active:bg-card"
      activeClassName="text-primary"
      inactiveClassName="text-foreground/60"
    >
      <Icon className="h-5 w-5" strokeWidth={2.1} />
      <span className="tab-label max-w-full truncate">{label}</span>
    </NavLink>
  );
}
