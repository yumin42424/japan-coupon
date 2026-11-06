import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, parseLocale } = require("../.test-build/i18n/config.js");
const { translate } = require("../.test-build/i18n/translate.js");
const { messagesFor } = require("../.test-build/i18n/messages/index.js");

const TRANSLATED = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const JAPANESE = /[぀-ヿ㐀-鿿]/;
const KANA = /[぀-ヿ]/;
const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort();

test("i18n: parseLocale accepts only known locales and falls back to Japanese", () => {
  assert.equal(parseLocale("ko"), "ko");
  assert.equal(parseLocale("zh-TW"), "zh-TW");
  assert.equal(parseLocale("xx"), "ja");
  assert.equal(parseLocale(""), "ja");
  assert.equal(parseLocale(undefined), "ja");
  assert.equal(parseLocale(null), "ja");
});

test("i18n: every locale has a display name", () => {
  for (const locale of LOCALES) assert.ok(LOCALE_NAMES[locale], locale);
});

test("i18n: translate falls back to the Japanese key and fills parameters", () => {
  const messages = { こんにちは: "Hello", "{n}件": "Results: {n}" };
  assert.equal(translate(messages, "こんにちは"), "Hello");
  assert.equal(translate(messages, "{n}件", { n: 3 }), "Results: 3");
  assert.equal(translate(messages, "未翻訳の文"), "未翻訳の文");
  assert.equal(translate(null, "{n}件", { n: 3 }), "3件");
  assert.equal(translate(messages, null), "");
  assert.equal(translate(messages, undefined), "");
});

test("i18n: Japanese has no table, so Japanese visitors download no extra text", () => {
  assert.equal(messagesFor("ja"), null);
});

test("i18n: every translated locale has exactly the same keys", () => {
  const reference = Object.keys(messagesFor(TRANSLATED[0])).sort();
  assert.ok(reference.length > 400);
  for (const locale of TRANSLATED) {
    assert.deepEqual(Object.keys(messagesFor(locale)).sort(), reference, locale);
  }
});

test("i18n: no translation is empty, drops a placeholder, or leaves Japanese kana behind", () => {
  for (const locale of TRANSLATED) {
    for (const [key, value] of Object.entries(messagesFor(locale))) {
      assert.notEqual(value, "", `${locale}: empty for ${key}`);
      assert.deepEqual(placeholders(value), placeholders(key), `${locale}: placeholders for ${key}`);
      assert.equal(value.split("|").length, key.split("|").length, `${locale}: line markers for ${key}`);
      assert.ok(!KANA.test(value), `${locale}: kana in ${value}`);
    }
  }
});

// 화면에 나오는 일본어 문자열이 번역표에 없으면 그 문구만 일본어로 남는다. 새 문구를 넣고 번역을 빠뜨리면 여기서 실패한다.
function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

// 번역 대상이 아닌 곳: 관리자 화면, 약관 원문, 메일·LINE 본문, 개발자용 오류, 번역표 자체
function isTranslatedSurface(file) {
  if (file.startsWith("src/app/admin/")) {
    return file === "src/app/admin/redeem/redeem-form.tsx" || file === "src/app/admin/redeem/actions.ts";
  }
  if (file.startsWith("src/app/api/") || file.startsWith("src/i18n/")) return false;
  return ![
    "src/app/terms/page.tsx",
    "src/app/privacy/page.tsx",
    "src/lib/email.ts",
    "src/lib/email-config.ts",
    "src/lib/auth-tokens.ts",
    "src/lib/admin.ts",
    "src/lib/image-credits.ts",
    "src/auth.ts",
    "src/components/ja-ko.tsx",
  ].includes(file);
}

function japaneseLiterals(file) {
  const text = readFileSync(file, "utf-8");
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && JAPANESE.test(node.text)) {
      found.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

test("i18n: every Japanese string on a visitor-facing screen has a translation", () => {
  const table = messagesFor("en");
  const missing = new Set();
  for (const full of sourceFiles("src")) {
    const file = full.replace(/\\/g, "/");
    if (!isTranslatedSurface(file)) continue;
    for (const literal of japaneseLiterals(full)) {
      if (literal.startsWith("【K-Coupon Japan】") || literal === "権限がありません。" || literal.includes("<p>")) continue;
      if (!(literal in table)) missing.add(`${file}: ${literal}`);
    }
  }
  assert.deepEqual([...missing], []);
});

test("i18n: no Japanese is written directly into JSX on a visitor-facing screen", () => {
  const direct = [];
  for (const full of sourceFiles("src")) {
    const file = full.replace(/\\/g, "/");
    if (!file.endsWith("x") || !isTranslatedSurface(file)) continue;
    const source = ts.createSourceFile(full, readFileSync(full, "utf-8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxText(node) && JAPANESE.test(node.text)) direct.push(`${file}: ${node.text.trim()}`);
      if (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent) && JAPANESE.test(node.text)) direct.push(`${file}: ${node.text}`);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(direct, []);
});

test("i18n: image credit labels can be translated", () => {
  const table = messagesFor("en");
  const usages = [...readFileSync("src/lib/image-credits.ts", "utf-8").matchAll(/"usage": "(.+)（(.+)）"/g)];
  assert.ok(usages.length > 0);
  for (const [, label, note] of usages) {
    assert.ok(label in table, label);
    assert.ok(note in table, note);
  }
  const authors = [...readFileSync("src/lib/image-credits.ts", "utf-8").matchAll(/"author": "(.+)"/g)].map((match) => match[1]);
  for (const author of authors.filter((name) => JAPANESE.test(name))) assert.ok(author in table, author);
});
