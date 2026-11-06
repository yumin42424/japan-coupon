"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "@/i18n/config";

// 언어 메뉴에서 고른 언어를 1년간 기억한다. 잘못된 값은 기본 언어로 처리된다.
export async function setLocale(value: string) {
  (await cookies()).set(LOCALE_COOKIE, parseLocale(value), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
