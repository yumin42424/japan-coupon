"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 지금 보고 있는 페이지의 메뉴를 표시한다 (aria-current + 색).
// "/" 는 정확히 일치할 때만, 나머지는 하위 경로까지 포함한다 (예: /coupons/abc → クーポン).
export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  className,
  activeClassName,
  inactiveClassName = "",
  children,
}: {
  href: string;
  className: string;
  activeClassName: string;
  inactiveClassName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`${className} ${active ? activeClassName : inactiveClassName}`}>
      {children}
    </Link>
  );
}
