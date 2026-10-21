// 읽기 전용 스모크 테스트: 공개 페이지·접근 제어·보안 헤더·외부 호출 인증이 기대대로인지 확인한다.
// 데이터를 만들거나 바꾸지 않고, 비밀값도 필요 없다.
//   로컬:  npm run build && npx next start -p 3100   →   npm run smoke
//   운영:  npm run smoke -- https://japan-coupon-five.vercel.app
const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

let passed = 0, failed = 0;
const lines = [];
const check = (name, ok, detail = "") => {
  if (ok) passed++;
  else failed++;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   <- ${detail}`}`);
};
const get = async (path, init = {}) => {
  const res = await fetch(BASE + path, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...init });
  const body = await res.text();
  return { status: res.status, location: res.headers.get("location") ?? "", headers: res.headers, body };
};

// 1. 공개 페이지는 열린다
for (const p of ["/", "/coupons", "/areas/myeongdong", "/ranking", "/nearby", "/login", "/signup", "/forgot-password", "/privacy", "/terms", "/about", "/guide", "/partnership", "/notices", "/board", "/support", "/credits", "/sitemap.xml", "/robots.txt"]) {
  const r = await get(p);
  check(`public page ${p} -> 200`, r.status === 200, `got ${r.status}`);
}

// 2. 없는 것은 404 (데모/비공개 쿠폰 ID처럼 존재하지 않는 값도 마찬가지)
for (const p of ["/nonexistent-page", "/areas/nope", `/coupons/${ZERO_UUID}`, `/notices/${ZERO_UUID}`, "/lp/nope-nope"]) {
  const r = await get(p);
  check(`unknown ${p} -> 404`, r.status === 404, `got ${r.status}`);
}

// 3. 로그인이 필요한 곳은 비로그인 상태에서 로그인으로 보낸다
for (const p of ["/admin", "/admin/coupons", "/admin/stores", "/admin/redeem", "/admin/notices", "/admin/landing-pages", "/mypage", "/mypage/points", "/mypage/settings", "/onboarding", "/board/write"]) {
  const r = await get(p);
  check(`protected ${p} -> redirect to /login`, [302, 307, 308].includes(r.status) && r.location.includes("/login"), `got ${r.status} ${r.location}`);
}

// 4. RSC(클라이언트 이동용) 요청으로도 관리자 데이터가 새지 않는다
for (const p of ["/admin", "/admin/coupons", "/admin/stores", "/admin/redeem", "/admin/notices", "/admin/landing-pages"]) {
  for (const extra of [{}, { "Next-Router-Prefetch": "1" }]) {
    const r = await get(p, { headers: { RSC: "1", ...extra } });
    const leaked = /管理者ダッシュボード|会員登録数|クーポン発行数|店舗別|使用処理する/.test(r.body);
    check(`RSC ${p}${Object.keys(extra).length ? " (prefetch)" : ""} leaks no admin content`, !leaked, "admin text found in RSC payload");
  }
}

// 5. 보안 헤더
{
  const r = await get("/");
  const h = (k) => r.headers.get(k) ?? "";
  check("CSP header present with default-src 'self' and frame-ancestors 'none'", /default-src 'self'/.test(h("content-security-policy")) && /frame-ancestors 'none'/.test(h("content-security-policy")), h("content-security-policy").slice(0, 60));
  check("X-Content-Type-Options: nosniff", h("x-content-type-options") === "nosniff");
  check("X-Frame-Options: DENY", h("x-frame-options") === "DENY");
  check("Referrer-Policy set", h("referrer-policy") !== "");
  check("Permissions-Policy set", h("permissions-policy") !== "");
  check("X-Powered-By absent", h("x-powered-by") === "");
}

// 6. 외부에서 호출되는 엔드포인트는 인증 없이는 거부한다
{
  check("cron without secret -> 401", (await get("/api/cron/notify")).status === 401);
  check("cron with a wrong secret -> 401", (await get("/api/cron/notify", { headers: { Authorization: "Bearer wrong" } })).status === 401);
  check("cron with a wrong secret and dryRun -> 401", (await get("/api/cron/notify?dryRun=1", { headers: { Authorization: "Bearer wrong" } })).status === 401);
  const unsigned = await get("/api/line/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: [] }) });
  check("LINE webhook, unsigned POST -> 401", unsigned.status === 401, `got ${unsigned.status}`);
  const badSig = await get("/api/line/webhook", { method: "POST", headers: { "Content-Type": "application/json", "x-line-signature": "AAAA" }, body: JSON.stringify({ events: [] }) });
  check("LINE webhook, wrong signature -> 401", badSig.status === 401, `got ${badSig.status}`);
  check("LINE webhook, GET -> 405", (await get("/api/line/webhook")).status === 405);
}

// 7. 열린 리다이렉트 시도는 외부로 나가지 않는다
for (const p of ["/login?callbackUrl=https://evil.example", "/login?callbackUrl=//evil.example", "/signup?callbackUrl=https://evil.example"]) {
  const r = await get(p);
  check(`open-redirect probe ${p} does not redirect away`, r.status === 200 && !/evil\.example/.test(r.location), `got ${r.status} ${r.location}`);
}

// 8. 이미지 최적화 엔드포인트는 허용되지 않은 주소·크기를 거부한다 (SSRF 방어)
for (const [label, q] of [["external host", "https%3A%2F%2Fexample.com%2Fa.png&w=640&q=75"], ["cloud metadata address", "http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data&w=640&q=75"], ["unlisted width", "%2Fimages%2Fstock%2Fhotel.jpg&w=777&q=75"]]) {
  const r = await get(`/_next/image?url=${q}`);
  check(`image optimizer rejects ${label}`, r.status === 400, `got ${r.status}`);
}

// 9. 공개 화면은 데모/테스트 데이터나 개인 연락처를 드러내지 않는다
for (const p of ["/privacy", "/terms", "/support", "/about", "/partnership"]) {
  const r = await get(p);
  const text = r.body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
  check(`${p} shows no phone number`, !/\+?\d{1,3}[ -]\d{2,4}-\d{3,4}-\d{4}|\b0\d{1,2}-\d{3,4}-\d{4}\b/.test(text), "phone-like number found");
}
{
  const r = await get("/sitemap.xml");
  check("sitemap lists no coupon, notice, board or landing-page detail URLs", !/\/coupons\/[0-9a-f-]{36}|\/notices\/|\/board\/|\/lp\//.test(r.body));
}

console.log(`smoke test against ${BASE}\n${lines.join("\n")}\n\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
