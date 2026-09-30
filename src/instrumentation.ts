import * as Sentry from "@sentry/nextjs";

// SENTRY_DSN이 없으면(로컬 개발 등) Sentry.init이 조용히 no-op으로 동작한다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: !!process.env.SENTRY_DSN,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
