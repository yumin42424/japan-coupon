import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { signupSchema } = require("../.test-build/signup-schema.js");

const ok = { email: "  Taro@Example.COM ", password: "password1", nickname: "  たろう  ", acquisitionSource: "google_ads-1" };

test("signup schema: a valid form is accepted and normalised (email lower-cased + trimmed, nickname trimmed)", () => {
  const r = signupSchema.safeParse(ok);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, { email: "taro@example.com", password: "password1", nickname: "たろう", acquisitionSource: "google_ads-1" });
});

test("signup schema: bad e-mail addresses are rejected with the Japanese message", () => {
  for (const email of ["", "taro", "taro@", "@example.com", "taro@example", "ta ro@example.com"]) {
    const r = signupSchema.safeParse({ ...ok, email });
    assert.equal(r.success, false, JSON.stringify(email));
    assert.match(r.error.issues[0].message, /メールアドレス/);
  }
});

test("signup schema: password length is 8..128 (the password itself is not trimmed)", () => {
  assert.equal(signupSchema.safeParse({ ...ok, password: "a".repeat(7) }).success, false);
  assert.equal(signupSchema.safeParse({ ...ok, password: "a".repeat(8) }).success, true);
  assert.equal(signupSchema.safeParse({ ...ok, password: "a".repeat(128) }).success, true);
  assert.equal(signupSchema.safeParse({ ...ok, password: "a".repeat(129) }).success, false);
  assert.equal(signupSchema.safeParse({ ...ok, password: "  spaced  " }).data.password, "  spaced  ");
});

test("signup schema: nickname must have 1..30 characters after trimming", () => {
  assert.equal(signupSchema.safeParse({ ...ok, nickname: "" }).success, false);
  assert.equal(signupSchema.safeParse({ ...ok, nickname: "   " }).success, false);
  assert.equal(signupSchema.safeParse({ ...ok, nickname: "あ".repeat(30) }).success, true);
  assert.equal(signupSchema.safeParse({ ...ok, nickname: "あ".repeat(31) }).success, false);
});

test("signup schema: an unsafe or missing acquisitionSource never fails the form, it becomes 'direct'", () => {
  for (const acquisitionSource of ["<script>alert(1)</script>", "a b", "x".repeat(41), "日本語", "", undefined, null, 42]) {
    const r = signupSchema.safeParse({ ...ok, acquisitionSource });
    assert.equal(r.success, true, String(acquisitionSource));
    assert.equal(r.data.acquisitionSource, "direct", String(acquisitionSource));
  }
});

test("signup schema: missing fields are rejected, extra fields are dropped", () => {
  assert.equal(signupSchema.safeParse({}).success, false);
  const r = signupSchema.safeParse({ ...ok, isAdmin: true, role: "admin" });
  assert.equal(r.success, true);
  assert.equal("isAdmin" in r.data, false);
  assert.equal("role" in r.data, false);
});
