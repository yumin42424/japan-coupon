import type { NextConfig } from "next";

// 실제 사용 중인 외부 도메인만 허용 — Kakao Maps(지도 SDK+타일), Wikimedia(이미지),
// Sentry(에러 리포팅), Vercel Analytics. Supabase/Resend/LINE은 전부 서버에서만 호출되므로
// 브라우저 CSP에는 안 들어간다.
// React/Next의 개발 모드 Fast Refresh·에러 오버레이는 eval()을 쓴다(프로덕션 빌드는 안 씀) —
// 개발 환경에서만 'unsafe-eval'을 허용해서 CSP가 로컬 개발 서버를 깨지 않게 한다.
const isDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://dapi.kakao.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://commons.wikimedia.org https://*.daumcdn.net",
  "font-src 'self' data:",
  "connect-src 'self' https://dapi.kakao.com https://*.daumcdn.net https://*.ingest.us.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:FilePath/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
