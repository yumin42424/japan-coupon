import type { NextConfig } from "next";

// 실제 사용 중인 외부 도메인만 허용 — Kakao Maps(지도 SDK+타일), Sentry(에러 리포팅), Vercel Analytics.
// 대표 이미지는 사이트 안(public/images/stock)에서 직접 서비스하므로 이미지용 외부 도메인은 Supabase Storage(리뷰 사진)뿐이다. Supabase/Resend/LINE은 전부 서버에서만 호출되므로
// 브라우저 CSP에는 안 들어간다.
// React/Next의 개발 모드 Fast Refresh·에러 오버레이는 eval()을 쓴다(프로덕션 빌드는 안 씀) —
// 개발 환경에서만 'unsafe-eval'을 허용해서 CSP가 로컬 개발 서버를 깨지 않게 한다.
const isDev = process.env.NODE_ENV !== "production";
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;
// Kakao Maps: dapi.kakao.com의 sdk.js는 로더일 뿐이고, kakao.maps.load()가 지도 본체를
// t1.kakaocdn.net(2026-11 확인, 예전엔 daumcdn)에서 불러온다. 여기서 막히면 지도가 빈 칸이 된다.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://dapi.kakao.com https://t1.kakaocdn.net https://t1.daumcdn.net https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.daumcdn.net https://*.kakaocdn.net${supabaseHostname ? ` https://${supabaseHostname}` : ""}`,
  "font-src 'self' data:",
  "connect-src 'self' https://dapi.kakao.com https://*.daumcdn.net https://*.kakaocdn.net https://*.ingest.us.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
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
            value: "camera=(self), microphone=(), payment=(), usb=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
