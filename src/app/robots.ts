import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/*",
        "/login",
        "/signup",
        "/onboarding",
        "/mypage",
        "/mypage/*",
        "/api/*",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
