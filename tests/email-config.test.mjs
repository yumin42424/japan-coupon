import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveSender, maskEmail, SANDBOX_SENDER } = require("../.test-build/email-config.js");

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
