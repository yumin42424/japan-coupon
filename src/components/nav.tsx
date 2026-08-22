import Link from "next/link";
import { Home, Ticket, User, Shield, LogIn, Trophy, BookOpen, Megaphone, MessagesSquare } from "lucide-react";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

export async function Nav() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/80 px-4 py-3.5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="shrink-0 text-lg font-extrabold tracking-tight text-foreground transition hover:opacity-80"
          >
            K-Coupon <span className="text-primary">Japan</span>
          </Link>

          {/* 데스크탑: 아이콘+짧은 일본어 라벨 (한글 병기는 문서 텍스트에서만, 네비는 항목 수가 늘어도 안 깨지게 압축 유지) */}
          <nav className="hidden items-center gap-0.5 text-sm md:flex">
            <Link
              href="/coupons"
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:px-3"
            >
              <Ticket className="h-4 w-4" strokeWidth={2.25} />
              クーポン
            </Link>
            <Link
              href="/ranking"
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:flex lg:px-3"
            >
              <Trophy className="h-4 w-4" strokeWidth={2.25} />
              人気
            </Link>
            <Link
              href="/guide"
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:flex lg:px-3"
            >
              <BookOpen className="h-4 w-4" strokeWidth={2.25} />
              初めての方へ
            </Link>
            <Link
              href="/notices"
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:flex lg:px-3"
            >
              <Megaphone className="h-4 w-4" strokeWidth={2.25} />
              お知らせ
            </Link>
            <Link
              href="/board"
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:flex lg:px-3"
            >
              <MessagesSquare className="h-4 w-4" strokeWidth={2.25} />
              掲示板
            </Link>
            {session?.user ? (
              <>
                <Link
                  href="/mypage"
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:px-3"
                >
                  <User className="h-4 w-4" strokeWidth={2.25} />
                  マイページ
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:px-3"
                  >
                    <Shield className="h-4 w-4" strokeWidth={2.25} />
                    <span className="hidden lg:inline">管理者</span>
                  </Link>
                )}
                <span className="ml-1 hidden max-w-[9rem] truncate rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted lg:block">
                  {session.user.name}
                </span>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-2.5 py-1.5 font-medium text-foreground/70 transition hover:bg-card hover:text-foreground lg:px-3"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="ml-1 rounded-full bg-primary px-3.5 py-1.5 font-medium text-primary-foreground shadow-sm shadow-primary/30 transition hover:opacity-90 lg:px-4"
                >
                  無料会員登録
                </Link>
              </>
            )}
          </nav>

          {/* 모바일: 로그인 상태만 압축해서 표시, 나머지는 하단 탭바가 담당 */}
          <div className="flex items-center gap-2 md:hidden">
            {session?.user ? (
              <span className="max-w-[7rem] truncate text-xs font-medium text-muted">
                {session.user.name}
              </span>
            ) : (
              <Link
                href="/signup"
                className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/30"
              >
                無料登録
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 모바일 전용 하단 탭바 */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
        <div
          className="mx-auto flex max-w-3xl items-stretch justify-around px-2 pt-1.5"
          style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
        >
          <TabItem href="/" icon={Home} label="ホーム" />
          <TabItem href="/coupons" icon={Ticket} label="クーポン" />
          <TabItem href="/ranking" icon={Trophy} label="人気" />
          {session?.user ? (
            <TabItem href="/mypage" icon={User} label="マイページ" />
          ) : (
            <TabItem href="/login" icon={LogIn} label="ログイン" />
          )}
          {isAdmin && <TabItem href="/admin" icon={Shield} label="管理者" />}
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
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium text-foreground/60 transition active:bg-card"
    >
      <Icon className="h-5 w-5" strokeWidth={2.1} />
      {label}
    </Link>
  );
}
