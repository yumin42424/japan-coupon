import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractCouponCode } = require("../.test-build/coupon-code.js");
const jsQR = require("jsqr");
const QRCode = require("qrcode");

const CODE = "7f3a9c21-5b8e-4d2a-9c61-0a4e8b2d7f15";

test("coupon code: a scanned or typed value gives the same code", () => {
  assert.equal(extractCouponCode(CODE), CODE);
  assert.equal(extractCouponCode(`  ${CODE.toUpperCase()}\n`), CODE);
  assert.equal(extractCouponCode(`https://example.com/staff/redeem?code=${CODE}`), CODE);
  assert.equal(extractCouponCode("  not-a-code "), "not-a-code");
  assert.equal(extractCouponCode(""), "");
});

// 직원 화면의 카메라 스캔(아이폰 등 브라우저 QR 기능이 없는 기기)은 jsQR 로 읽는다.
// 손님 마이페이지와 같은 qrcode 라이브러리로 만든 QR 을 실제로 읽어 낼 수 있는지 확인한다.
function qrImage(text, scale = 6, margin = 4) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const side = (modules.size + margin * 2) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (!modules.get(row, col)) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const i = (((row + margin) * scale + y) * side + (col + margin) * scale + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  return { data, side };
}

test("coupon code: the customer's QR can be read without the browser's built-in reader", () => {
  const { data, side } = qrImage(CODE);
  const result = jsQR(data, side, side, { inversionAttempts: "dontInvert" });
  assert.ok(result, "QR not found");
  assert.equal(extractCouponCode(result.data), CODE);
});

test("coupon code: a blank frame is not mistaken for a QR", () => {
  const side = 200;
  const blank = new Uint8ClampedArray(side * side * 4).fill(255);
  assert.equal(jsQR(blank, side, side, { inversionAttempts: "dontInvert" }), null);
});
