import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// tests/run.mjs 가 먼저 src/lib 의 순수 로직을 .test-build 로 컴파일한다.
const require = createRequire(import.meta.url);
const { validatePointUseRequest, mapRpcResult, isValidRequestId } = require("../.test-build/point-use.js");
const policy = require("../.test-build/point-policy.js");

const REQ = "3f2b8a56-9d0e-4c5a-8b1f-0a1b2c3d4e5f";
const option = { id: "opt1", label: "テスト", description: "d", cost: 30, enabled: true };
const on = { enabled: true, options: [option] };

test("shipping config: point use is disabled and every request is rejected", () => {
  assert.equal(policy.POINT_USE_ENABLED, false);
  assert.deepEqual(policy.POINT_USE_OPTIONS, []);
  assert.deepEqual(validatePointUseRequest({ optionId: "anything", requestId: REQ }), { ok: false, status: "disabled" });
});

test("enabled flag alone is not enough: without options it is still disabled", () => {
  assert.deepEqual(validatePointUseRequest({ optionId: "opt1", requestId: REQ }, { enabled: true, options: [] }), { ok: false, status: "disabled" });
});

test("valid request: amount comes from the server policy", () => {
  const v = validatePointUseRequest({ optionId: "opt1", requestId: REQ }, on);
  assert.equal(v.ok, true);
  assert.equal(v.amount, 30);
  assert.equal(v.option.id, "opt1");
  assert.equal(v.requestId, REQ);
});

test("client-supplied amount / cost / userId fields are ignored", () => {
  const v = validatePointUseRequest({ optionId: "opt1", requestId: REQ, amount: 1, cost: 1, userId: "someone-else", balance: 999999 }, on);
  assert.equal(v.ok, true);
  assert.equal(v.amount, 30);
});

test("invalid request ids are rejected", () => {
  for (const bad of ["", "abc", "123", null, undefined, 123, {}, [], REQ + "x", " " + REQ]) {
    assert.deepEqual(validatePointUseRequest({ optionId: "opt1", requestId: bad }, on), { ok: false, status: "invalid_request" }, String(bad));
  }
  assert.equal(isValidRequestId(REQ), true);
  assert.equal(isValidRequestId(REQ.toUpperCase()), true);
});

test("unknown / disabled / non-string options are rejected", () => {
  for (const bad of ["nope", "", null, undefined, 5, {}, "OPT1"]) {
    assert.deepEqual(validatePointUseRequest({ optionId: bad, requestId: REQ }, on), { ok: false, status: "option_unavailable" }, String(bad));
  }
  const withDisabled = { enabled: true, options: [option, { ...option, id: "off", enabled: false }] };
  assert.deepEqual(validatePointUseRequest({ optionId: "off", requestId: REQ }, withDisabled), { ok: false, status: "option_unavailable" });
});

test("a broken policy (zero / negative / fractional cost) can never produce a charge", () => {
  for (const cost of [0, -10, 1.5, NaN, Infinity]) {
    const p = { enabled: true, options: [{ ...option, cost }] };
    assert.deepEqual(validatePointUseRequest({ optionId: "opt1", requestId: REQ }, p), { ok: false, status: "invalid_request" }, String(cost));
  }
});

test("RPC result mapping", () => {
  assert.deepEqual(mapRpcResult({ status: "ok", used: 30, balance: 70 }), { status: "success", used: 30, balance: 70 });
  assert.deepEqual(mapRpcResult({ status: "already_processed", used: 30, balance: 70 }), { status: "already_processed", used: 30, balance: 70 });
  assert.deepEqual(mapRpcResult({ status: "insufficient", balance: 5 }), { status: "insufficient", balance: 5 });
  for (const s of ["invalid_amount", "invalid_request", "request_conflict"]) assert.equal(mapRpcResult({ status: s }).status, "invalid_request");
  for (const junk of [null, undefined, "ok", 5, {}, { status: "user_not_found" }, { status: "weird" }]) assert.equal(mapRpcResult(junk).status, "error", String(junk));
  // numbers that are not finite numbers are dropped, not trusted
  assert.deepEqual(mapRpcResult({ status: "ok", used: "30", balance: NaN }), { status: "success", used: undefined, balance: undefined });
});
