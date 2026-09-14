import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { distanceKm, formatDistance } from "@/lib/geo";
import { CATEGORIES } from "@/lib/taxonomy";

const CHANNEL_SECRET = process.env.LINE_MESSAGING_CHANNEL_SECRET ?? "";
const CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

// 회원 전용 쿠폰은 챗에서 눌러도 로그인 전엔 내용을 못 보니, LINE 답장에는 비회원도 바로 볼 수 있는 것만 담는다.
const SEARCH_RADIUS_KM = 5;
const MAX_RESULTS = 5;

type LineLocationMessage = { type: "location"; latitude: number; longitude: number };
type LineTextMessage = { type: "text"; text: string };
type LineEvent =
  | { type: "follow"; replyToken: string }
  | { type: "message"; replyToken: string; message: LineLocationMessage | LineTextMessage | { type: string } };

type NearbyCouponRow = {
  id: string;
  title: string;
  discount_info: string | null;
  stores: {
    id: string;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
  };
};

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !CHANNEL_SECRET) return false;
  const expected = crypto.createHmac("sha256", CHANNEL_SECRET).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function replyMessage(replyToken: string, messages: unknown[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    console.error("LINE reply failed", res.status, await res.text());
  }
}

async function findNearbyCoupons(lat: number, lng: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("coupons")
    .select(
      "id, title, discount_info, stores!inner(id, name, category, latitude, longitude)"
    )
    .eq("member_only", false)
    .gte("valid_to", today)
    .not("stores.latitude", "is", null)
    .not("stores.longitude", "is", null);

  const rows = (data ?? []) as unknown as NearbyCouponRow[];

  const seenStore = new Set<string>();
  const nearby: Array<NearbyCouponRow & { distance: number }> = [];
  for (const row of rows) {
    const distance = distanceKm(lat, lng, row.stores.latitude, row.stores.longitude);
    if (distance > SEARCH_RADIUS_KM) continue;
    nearby.push({ ...row, distance });
  }
  nearby.sort((a, b) => a.distance - b.distance);

  const picked: Array<NearbyCouponRow & { distance: number }> = [];
  for (const row of nearby) {
    if (seenStore.has(row.stores.id)) continue;
    seenStore.add(row.stores.id);
    picked.push(row);
    if (picked.length >= MAX_RESULTS) break;
  }
  return picked;
}

function buildNearbyFlexMessage(items: Array<NearbyCouponRow & { distance: number }>) {
  return {
    type: "flex",
    altText: "近くのお得なクーポン",
    contents: {
      type: "carousel",
      contents: items.map((item) => {
        const category = CATEGORIES.find((c) => c.value === item.stores.category);
        return {
          type: "bubble",
          size: "kilo",
          body: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              { type: "text", text: item.stores.name, weight: "bold", size: "md", wrap: true },
              {
                type: "text",
                text: `${category?.ja ?? ""} ・ ${formatDistance(item.distance)}`,
                size: "sm",
                color: "#999999",
              },
              {
                type: "text",
                text: item.title,
                size: "sm",
                weight: "bold",
                color: "#E0434B",
                wrap: true,
                margin: "md",
              },
              ...(item.discount_info
                ? [{ type: "text", text: item.discount_info, size: "xs", color: "#666666", wrap: true }]
                : []),
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#E0434B",
                height: "sm",
                action: { type: "uri", label: "クーポンを見る", uri: `${SITE_URL}/coupons/${item.id}` },
              },
            ],
          },
        };
      }),
    },
  };
}

const GUIDE_TEXT =
  "📍現在地を送っていただくと、近くのお得なクーポンをお届けします！\nチャット下の「+」→「位置情報」から送ってみてください。";

async function handleEvent(event: LineEvent) {
  if (event.type === "follow") {
    await replyMessage(event.replyToken, [
      { type: "text", text: `友だち追加ありがとうございます🇰🇷\n\n${GUIDE_TEXT}` },
    ]);
    return;
  }

  if (event.type !== "message") return;

  if (event.message.type === "location") {
    const { latitude, longitude } = event.message as LineLocationMessage;
    const items = await findNearbyCoupons(latitude, longitude);

    if (items.length === 0) {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: `この辺りにはまだクーポンがありません😢\nアプリでカテゴリ・エリアから探してみてください。\n${SITE_URL}/coupons`,
        },
      ]);
      return;
    }

    await replyMessage(event.replyToken, [buildNearbyFlexMessage(items)]);
    return;
  }

  if (event.message.type === "text") {
    await replyMessage(event.replyToken, [{ type: "text", text: GUIDE_TEXT }]);
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: { events: LineEvent[] };
  try {
    body = JSON.parse(rawBody) as { events: LineEvent[] };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  await Promise.all(body.events.map((event) => handleEvent(event)));

  return NextResponse.json({});
}
