import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveSender, maskEmail, mailReadiness, SANDBOX_SENDER } = require("../.test-build/email-config.js");

test("mailReadiness: production without EMAIL_FROM is NOT ready (the sandbox sender is never the production default)", () => {
  for (const emailFrom of [undefined, null, "", "   "]) {
    assert.deepEqual(mailReadiness({ apiKey: "re_key", emailFrom, production: true }), { ready: false, reason: "no_sender" });
  }
});

test("mailReadiness: production with a verified-domain sender is ready and not sandbox", () => {
  const r = mailReadiness({ apiKey: "re_key", emailFrom: "K-Coupon Japan <noreply@mail.kcoupon.example>", production: true });
  assert.deepEqual(r, { ready: true, from: "K-Coupon Japan <noreply@mail.kcoupon.example>", isSandbox: false });
});

test("mailReadiness: an operator who explicitly sets the sandbox address in production is allowed but flagged", () => {
  const r = mailReadiness({ apiKey: "re_key", emailFrom: "Test <onboarding@resend.dev>", production: true });
  assert.equal(r.ready, true);
  assert.equal(r.isSandbox, true);
});

test("mailReadiness: a malformed EMAIL_FROM is never ready, in any environment", () => {
  for (const production of [true, false]) {
    assert.deepEqual(mailReadiness({ apiKey: "re_key", emailFrom: "not-an-address", production }), { ready: false, reason: "invalid_sender" });
    assert.deepEqual(mailReadiness({ apiKey: "re_key", emailFrom: "A <a@example.com>\r\nBcc: x@example.net", production }), { ready: false, reason: "invalid_sender" });
  }
});

test("mailReadiness: no API key is never ready (checked before the sender)", () => {
  for (const apiKey of [undefined, null, "", "  "]) {
    for (const production of [true, false]) {
      assert.deepEqual(mailReadiness({ apiKey, emailFrom: "noreply@kcoupon.example", production }), { ready: false, reason: "no_api_key" });
    }
  }
});

test("mailReadiness: outside production an empty EMAIL_FROM falls back to the sandbox sender (local development only)", () => {
  const r = mailReadiness({ apiKey: "re_key", emailFrom: "", production: false });
  assert.deepEqual(r, { ready: true, from: SANDBOX_SENDER, isSandbox: true });
});

test("resolveSender: an empty EMAIL_FROM falls back to the Resend sandbox sender and says it is not configured", () => {
  for (const empty of [undefined, null, "", "   "]) {
    const s = resolveSender(empty);
    assert.equal(s.ok, true);
    assert.equal(s.from, SANDBOX_SENDER);
    assert.equal(s.isSandbox, true);
    assert.equal(s.configured, false);
  }
});

test("resolveSender: a verified-domain sender is accepted as configured and not sandbox", () => {
  const named = resolveSender("K-Coupon Japan <noreply@kcoupon.example>");
  assert.deepEqual(
    { ok: named.ok, isSandbox: named.isSandbox, configured: named.configured, domain: named.domain },
    { ok: true, isSandbox: false, configured: true, domain: "kcoupon.example" }
  );
  assert.equal(named.from, "K-Coupon Japan <noreply@kcoupon.example>");

  const bare = resolveSender("  noreply@Mail.KCoupon.example ");
  assert.equal(bare.ok, true);
  assert.equal(bare.domain, "mail.kcoupon.example");
  assert.equal(bare.isSandbox, false);
});

test("resolveSender: explicitly setting the sandbox address is still reported as sandbox", () => {
  const s = resolveSender("Test <onboarding@resend.dev>");
  assert.equal(s.ok, true);
  assert.equal(s.isSandbox, true);
  assert.equal(s.configured, true);
});

test("resolveSender: malformed values are rejected instead of being sent to Resend", () => {
  const bad = [
    "noreply",
    "noreply@",
    "@example.com",
    "noreply@localhost",
    "no reply@example.com",
    "Name <noreply@example.com",
    "Name noreply@example.com>",
    "<>",
    "a@b@example.com",
    "Name <noreply@example.com>\r\nBcc: attacker@example.net",
    'Evil "quote" <noreply@example.com>',
    "Name <noreply@example.com> trailing",
    "noreply@-bad-.example.com",
  ];
  for (const v of bad) assert.deepEqual(resolveSender(v), { ok: false }, JSON.stringify(v));
});

test("maskEmail: keeps the domain and the first letter only, never throws on odd input", () => {
  assert.equal(maskEmail("taro@example.com"), "t***@example.com");
  assert.equal(maskEmail("a@b.co"), "a***@b.co");
  assert.equal(maskEmail("weird"), "***");
  assert.equal(maskEmail(""), "***");
  assert.equal(maskEmail("@example.com"), "***");
  assert.equal(maskEmail("trailing@"), "***");
  assert.ok(!maskEmail("someone.private@example.com").includes("someone"));
});
