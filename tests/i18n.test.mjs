import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, parseLocale, detectLocale } = require("../.test-build/i18n/config.js");
const { translate } = require("../.test-build/i18n/translate.js");
const {
  AZURE_LANGUAGE_CODES,
  LANGUAGE_NAMES,
  azureSourceLanguage,
  parseAzureTranslations,
  applyTexts,
  buildSystemPrompt,
  chunkTexts,
  collectTexts,
  hashText,
  isTranslatable,
  parseTranslations,
} = require("../.test-build/i18n/content-core.js");
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

test("i18n: first visit follows the browser language", () => {
  assert.equal(detectLocale("ja,en-US;q=0.9"), "ja");
  assert.equal(detectLocale("ko-KR,ko;q=0.9,en;q=0.8"), "ko");
  assert.equal(detectLocale("en-US,en;q=0.9"), "en");
  assert.equal(detectLocale("de-DE,de;q=0.9,en;q=0.5"), "de");
  assert.equal(detectLocale("pt-BR"), "pt");
  assert.equal(detectLocale("in-ID"), "id");
  assert.equal(detectLocale("en;q=0.5,fr;q=0.9"), "fr");
  assert.equal(detectLocale("fr;q=0,de"), "de");
  assert.equal(detectLocale("zh-CN,zh;q=0.9"), "zh-CN");
  assert.equal(detectLocale("zh"), "zh-CN");
  assert.equal(detectLocale("zh-TW"), "zh-TW");
  assert.equal(detectLocale("zh-HK"), "zh-TW");
  assert.equal(detectLocale("zh-Hant-TW"), "zh-TW");
});

test("i18n: an unsupported browser language gets English", () => {
  assert.equal(detectLocale("ar-SA,ar;q=0.9"), "en");
  assert.equal(detectLocale("it-IT,ar;q=0.5,de;q=0.2"), "de");
});

test("i18n: search engines, link previews and requests without a language stay Japanese", () => {
  assert.equal(detectLocale(null), "ja");
  assert.equal(detectLocale(""), "ja");
  assert.equal(detectLocale("*"), "ja");
  const CHROME = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";
  assert.equal(detectLocale("ko-KR", CHROME), "ko");
  for (const bot of ["Googlebot/2.1", "bingbot/2.0", "facebookexternalhit/1.1", "kakaotalk-scrap/1.0", "Mozilla/5.0 Chrome-Lighthouse"]) {
    assert.equal(detectLocale("en-US", bot), "ja", bot);
  }
  assert.equal(detectLocale("ko-KR", "Mozilla/5.0 (iPhone) Safari/604.1 Line/14.0"), "ko");
});

test("content: rows are translated by path without touching other fields or the original", () => {
  const rows = [
    { id: "1", title: "焼肉", price: 100, stores: { name: "明洞食堂", category: "gourmet" } },
    { id: "2", title: "焼肉", price: 200, stores: [{ name: "弘大カフェ", category: "cafe" }] },
    { id: "3", title: null, stores: null },
  ];
  const paths = ["title", "stores.name"];
  assert.deepEqual(collectTexts(rows, paths), ["焼肉", "明洞食堂", "弘大カフェ"]);
  const result = applyTexts(rows, paths, (text) => `[${text}]`);
  assert.deepEqual(result, [
    { id: "1", title: "[焼肉]", price: 100, stores: { name: "[明洞食堂]", category: "gourmet" } },
    { id: "2", title: "[焼肉]", price: 200, stores: [{ name: "[弘大カフェ]", category: "cafe" }] },
    { id: "3", title: null, stores: null },
  ]);
  assert.equal(rows[0].title, "焼肉");
  assert.equal(rows[0].stores.name, "明洞食堂");
});

test("content: values without letters are not sent for translation", () => {
  assert.equal(isTranslatable("20% OFF"), true);
  assert.equal(isTranslatable("10:00-20:00"), false);
  assert.equal(isTranslatable("  "), false);
  assert.equal(isTranslatable(null), false);
  assert.equal(isTranslatable(100), false);
});

test("content: batches stay small and very long text travels alone", () => {
  const short = Array.from({ length: 90 }, (_, i) => `文${i}`);
  assert.deepEqual(chunkTexts(short).map((chunk) => chunk.length), [40, 40, 10]);
  const long = "あ".repeat(9000);
  assert.deepEqual(chunkTexts(["短い", long, "短い2"]).map((chunk) => chunk.length), [1, 1, 1]);
  assert.deepEqual(chunkTexts([]), []);
});

test("content: a model reply only counts when it matches a source text", () => {
  const sources = ["焼肉", "カフェ"];
  const ok = parseTranslations(JSON.stringify({ translations: [{ id: 0, text: "BBQ" }, { id: 1, text: "Cafe" }] }), sources);
  assert.deepEqual([...ok], [["焼肉", "BBQ"], ["カフェ", "Cafe"]]);
  const partial = parseTranslations(JSON.stringify({ translations: [{ id: 1, text: "Cafe" }, { id: 7, text: "x" }, { id: 0, text: " " }, { id: "0", text: "y" }] }), sources);
  assert.deepEqual([...partial], [["カフェ", "Cafe"]]);
  assert.equal(parseTranslations("not json", sources).size, 0);
  assert.equal(parseTranslations(JSON.stringify({ other: [] }), sources).size, 0);
});

test("content: every language has an Azure Translator code", () => {
  for (const locale of TRANSLATED) assert.ok(AZURE_LANGUAGE_CODES[locale], locale);
  assert.equal(AZURE_LANGUAGE_CODES["zh-CN"], "zh-Hans");
  assert.equal(AZURE_LANGUAGE_CODES["zh-TW"], "zh-Hant");
});

test("content: Japanese text is sent as Japanese, other languages are detected by Azure", () => {
  assert.equal(azureSourceLanguage("韓国焼肉セット20%オフ"), "ja");
  assert.equal(azureSourceLanguage("明洞食堂"), "ja");
  assert.equal(azureSourceLanguage("명동에서 쿠폰을 썼어요"), null);
  assert.equal(azureSourceLanguage("명동 カフェ"), "ja");
  assert.equal(azureSourceLanguage("Great coffee"), null);
});

test("content: an Azure reply is matched to the texts in the order they were sent", () => {
  const sources = ["焼肉", "カフェ", "明洞"];
  const body = [
    { translations: [{ text: "BBQ", to: "en" }] },
    { translations: [] },
    { detectedLanguage: { language: "ja" }, translations: [{ text: "Myeongdong", to: "en" }] },
  ];
  assert.deepEqual([...parseAzureTranslations(body, sources)], [["焼肉", "BBQ"], ["明洞", "Myeongdong"]]);
  assert.equal(parseAzureTranslations({ error: { code: 403000 } }, sources).size, 0);
  assert.equal(parseAzureTranslations([{ translations: [{ text: " " }] }], sources).size, 0);
});

test("content: same text gives the same hash, and every language has a prompt", () => {
  assert.equal(hashText("焼肉"), hashText("焼肉"));
  assert.notEqual(hashText("焼肉"), hashText("焼肉 "));
  assert.match(hashText("焼肉"), /^[0-9a-f]{64}$/);
  for (const locale of TRANSLATED) assert.ok(buildSystemPrompt(locale).includes(LANGUAGE_NAMES[locale]), locale);
});

test("i18n: sentence fragments keep the space that joins them", () => {
  const fragments = ["利用期間: ", "ここにない内容は、", "ご不明な点やトラブルがあった場合は、", "ログインできませんでした。初めてご利用の方は"];
  for (const locale of TRANSLATED.filter((code) => !code.startsWith("zh"))) {
    const table = messagesFor(locale);
    for (const key of fragments) assert.ok(table[key].endsWith(" "), `${locale}: ${key}`);
    assert.equal(table["{first}{second}"], "{first} {second}", locale);
  }
  for (const locale of TRANSLATED) {
    assert.equal(messagesFor(locale)[" ・ "], " · ", locale);
    assert.equal(messagesFor(locale)["・"], " · ", locale);
  }
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
