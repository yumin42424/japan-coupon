import "server-only";
import { after } from "next/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import {
  AZURE_LANGUAGE_CODES,
  TRANSLATION_SCHEMA,
  applyTexts,
  azureSourceLanguage,
  buildSystemPrompt,
  chunkTexts,
  collectTexts,
  hashText,
  isTranslatable,
  parseAzureTranslations,
  parseTranslations,
} from "@/i18n/content-core";
import { getLocale } from "@/i18n/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// DB에 저장된 내용(쿠폰·매장·공지·게시글·약관)의 자동 번역.
//   · 화면을 그릴 때는 저장된 번역만 읽는다. 절대 API 응답을 기다리지 않으므로 페이지가 느려지지 않는다.
//   · 저장된 번역이 없으면 이번에는 일본어로 보여 주고, 응답을 보낸 뒤 번역해서 저장한다.
//   · 관리자가 쿠폰·매장·공지를 저장할 때는 12개 언어를 미리 번역해 둔다.
//   · 번역 키나 테이블이 아직 없으면 조용히 일본어로 보여 준다.
//
// 번역 엔진은 환경변수로 고른다 (둘 다 있으면 Azure):
//   · AZURE_TRANSLATOR_KEY (+ AZURE_TRANSLATOR_REGION)  Azure Translator. 무료 요금제(F0)는 월 사용량 안에서 0원
//   · ANTHROPIC_API_KEY                                   Claude. 문맥을 더 잘 살리지만 번역할 때마다 요금이 든다

const TABLE = "content_translations";
const MODEL = "claude-opus-5-5";
const AZURE_ENDPOINT = "https://api.cognitive.microsofttranslator.com";
// Azure 문서의 가장 엄격한 한도(요청당 25개·5,000자)에 맞춘다
const AZURE_MAX_ITEMS = 25;
const AZURE_MAX_CHARS = 5000;
const HASHES_PER_QUERY = 100;
const LOCALES_AT_ONCE = 3;

type TranslatedLocale = Exclude<Locale, "ja">;
type Provider = "azure" | "claude";

function translationProvider(): Provider | null {
  if (process.env.AZURE_TRANSLATOR_KEY) return "azure";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}

// 같은 서버 인스턴스에서 같은 문장을 동시에 두 번 번역하지 않는다.
const inFlight = new Set<string>();
let reportedStorageError = false;

async function readStored(texts: readonly string[], locale: Locale): Promise<Map<string, string> | null> {
  const byHash = new Map(texts.map((text) => [hashText(text), text]));
  const hashes = [...byHash.keys()];
  const stored = new Map<string, string>();
  for (let i = 0; i < hashes.length; i += HASHES_PER_QUERY) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("source_hash, translated")
      .eq("locale", locale)
      .in("source_hash", hashes.slice(i, i + HASHES_PER_QUERY));
    if (error) {
      // 테이블을 만들기 전까지는 여기로 온다.
      if (!reportedStorageError) console.error("[content-translation] cannot read translations:", error.message);
      reportedStorageError = true;
      return null;
    }
    for (const row of (data ?? []) as { source_hash: string; translated: string }[]) {
      const source = byHash.get(row.source_hash);
      if (source !== undefined) stored.set(source, row.translated);
    }
  }
  return stored;
}

async function requestAzure(texts: string[], locale: TranslatedLocale): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const bySource = new Map<string, string[]>();
  for (const text of texts) {
    const from = azureSourceLanguage(text) ?? "";
    bySource.set(from, [...(bySource.get(from) ?? []), text]);
  }
  const headers: Record<string, string> = {
    "Ocp-Apim-Subscription-Key": process.env.AZURE_TRANSLATOR_KEY ?? "",
    "Content-Type": "application/json; charset=UTF-8",
  };
  if (process.env.AZURE_TRANSLATOR_REGION) headers["Ocp-Apim-Subscription-Region"] = process.env.AZURE_TRANSLATOR_REGION;
  for (const [from, group] of bySource) {
    const url = new URL("/translate", process.env.AZURE_TRANSLATOR_ENDPOINT || AZURE_ENDPOINT);
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("to", AZURE_LANGUAGE_CODES[locale]);
    if (from) url.searchParams.set("from", from);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(group.map((text) => ({ Text: text }))),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      if (!response.ok) {
        // 401: 키·지역 값이 틀림, 403: 무료 사용량 소진, 429: 너무 빠른 요청
        console.error("[content-translation] Azure Translator", response.status, (await response.text()).slice(0, 200));
        continue;
      }
      for (const [source, text] of parseAzureTranslations(await response.json(), group)) result.set(source, text);
    } catch (error) {
      console.error("[content-translation] Azure Translator request failed:", error);
    }
  }
  return result;
}

async function requestClaude(texts: string[], locale: TranslatedLocale): Promise<Map<string, string>> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: TRANSLATION_SCHEMA } },
      system: buildSystemPrompt(locale),
      messages: [{ role: "user", content: JSON.stringify(texts.map((text, id) => ({ id, text }))) }],
    });
    if (response.stop_reason !== "end_turn") {
      console.error("[content-translation] stopped early:", response.stop_reason);
      return new Map();
    }
    const raw = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    return parseTranslations(raw, texts);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[content-translation] ANTHROPIC_API_KEY was rejected");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("[content-translation] rate limited");
    } else if (error instanceof Anthropic.APIError) {
      console.error("[content-translation] API error", error.status, error.message);
    } else {
      console.error("[content-translation] request failed:", error);
    }
    return new Map();
  }
}

async function translateAndStore(texts: readonly string[], locale: TranslatedLocale) {
  const provider = translationProvider();
  if (!provider) return;
  let pending = texts.filter((text) => !inFlight.has(`${locale}:${text}`));
  if (provider === "azure") {
    // 한 요청에 담을 수 없는 아주 긴 글은 번역하지 않고 원문으로 둔다(잘라서 보내지 않는다)
    const tooLong = pending.filter((text) => text.length > AZURE_MAX_CHARS);
    if (tooLong.length > 0) console.error(`[content-translation] ${tooLong.length} text(s) over ${AZURE_MAX_CHARS} characters left untranslated`);
    pending = pending.filter((text) => text.length <= AZURE_MAX_CHARS);
  }
  for (const text of pending) inFlight.add(`${locale}:${text}`);
  try {
    const chunks = provider === "azure" ? chunkTexts(pending, AZURE_MAX_ITEMS, AZURE_MAX_CHARS) : chunkTexts(pending);
    for (const chunk of chunks) {
      const translated = provider === "azure" ? await requestAzure(chunk, locale) : await requestClaude(chunk, locale);
      if (translated.size === 0) continue;
      const rows = [...translated].map(([source, text]) => ({
        source_hash: hashText(source),
        locale,
        translated: text,
      }));
      const { error } = await supabaseAdmin.from(TABLE).upsert(rows, { onConflict: "source_hash,locale" });
      if (error) console.error("[content-translation] cannot save translations:", error.message);
    }
  } finally {
    for (const text of pending) inFlight.delete(`${locale}:${text}`);
  }
}

export type ContentTranslator = {
  /** 번역이 있으면 번역을, 없으면 원문을 돌려준다. */
  tc: <T extends string | null | undefined>(text: T) => T | string;
  /** 넘긴 문장이 전부 번역돼 있으면 true (일본어 화면에서도 true). */
  complete: boolean;
};

export async function translateTexts(texts: readonly (string | null | undefined)[]): Promise<ContentTranslator> {
  const locale = await getLocale();
  if (locale === DEFAULT_LOCALE) return { tc: (text) => text, complete: true };

  const sources = [...new Set(texts.filter(isTranslatable))];
  if (sources.length === 0) return { tc: (text) => text, complete: true };

  const stored = await readStored(sources, locale);
  if (!stored) return { tc: (text) => text, complete: false };

  const missing = sources.filter((text) => !stored.has(text));
  if (missing.length > 0) after(() => translateAndStore(missing, locale as TranslatedLocale));

  return {
    tc: (text) => (isTranslatable(text) ? (stored.get(text) ?? text) : text),
    complete: missing.length === 0,
  };
}

// 조회한 행의 지정한 칸만 번역한 복사본을 돌려준다. 예: translateRows(coupons, ["title", "stores.name"])
export async function translateRows<T>(rows: readonly T[], paths: readonly string[]): Promise<T[]> {
  if ((await getLocale()) === DEFAULT_LOCALE) return [...rows];
  const { tc } = await translateTexts(collectTexts(rows, paths));
  return applyTexts(rows, paths, (text) => tc(text));
}

export async function translateRow<T>(row: T, paths: readonly string[]): Promise<T> {
  const [translated] = await translateRows([row], paths);
  return translated;
}

// 관리자가 저장한 내용을 12개 언어로 미리 번역해 둔다. 저장 응답을 기다리게 하지 않는다.
export function pretranslate(texts: readonly (string | null | undefined)[]) {
  const sources = [...new Set(texts.filter(isTranslatable))];
  if (sources.length === 0 || !translationProvider()) return;
  const locales = LOCALES.filter((locale): locale is TranslatedLocale => locale !== DEFAULT_LOCALE);
  after(async () => {
    for (let i = 0; i < locales.length; i += LOCALES_AT_ONCE) {
      await Promise.all(
        locales.slice(i, i + LOCALES_AT_ONCE).map(async (locale) => {
          const stored = await readStored(sources, locale);
          if (!stored) return;
          await translateAndStore(sources.filter((text) => !stored.has(text)), locale);
        })
      );
    }
  });
}

// 게시글·리뷰를 지우면 그 번역도 함께 지운다.
export async function forgetTranslations(texts: readonly (string | null | undefined)[]) {
  const hashes = [...new Set(texts.filter(isTranslatable))].map(hashText);
  for (let i = 0; i < hashes.length; i += HASHES_PER_QUERY) {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .in("source_hash", hashes.slice(i, i + HASHES_PER_QUERY));
    if (error) {
      console.error("[content-translation] cannot delete translations:", error.message);
      return;
    }
  }
}
