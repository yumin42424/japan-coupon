import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendLinePush, textMessage } from "@/lib/line-push";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";
const REMINDER_DAYS = 3;

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// 정확히 N일 후인 건만 매칭해서, 매일 도는 cron이 같은 알림을 반복해서 안 보내게 한다
// (예: "3일 남았어요"는 유효기간이 오늘+3일인 날 딱 한 번만 조건에 걸림).
async function notifyExpiringCoupons(targetDate: string) {
  const { data: rows } = await supabaseAdmin
    .from("coupon_events")
    .select("user_id, coupons!inner(id, title, valid_to, stores(name)), users!inner(line_user_id)")
    .eq("event_type", "issue")
    .eq("coupons.valid_to", targetDate);

  type Row = {
    user_id: string;
    coupons: { id: string; title: string; stores: { name: string } | null } | null;
    users: { line_user_id: string | null } | null;
  };

  let sent = 0;
  for (const row of (rows ?? []) as unknown as Row[]) {
    const lineUserId = row.users?.line_user_id;
    if (!lineUserId || !row.coupons) continue;

    // 이미 사용 처리된 쿠폰은 알림 대상에서 제외
    const { data: usedRow } = await supabaseAdmin
      .from("coupon_events")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("coupon_id", row.coupons.id)
      .eq("event_type", "use")
      .maybeSingle();
    if (usedRow) continue;

    const ok = await sendLinePush(lineUserId, [
      textMessage(
        `⏰もうすぐ期限切れです\n\n${row.coupons.stores?.name ?? ""}\n${row.coupons.title}\n有効期限: ${REMINDER_DAYS}日後\n\n忘れずにご利用ください！\n${SITE_URL}/mypage`
      ),
    ]);
    if (ok) sent++;
  }
  return sent;
}

async function notifyUpcomingTravel(targetDate: string) {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("line_user_id")
    .eq("travel_date", targetDate)
    .not("line_user_id", "is", null);

  let sent = 0;
  for (const u of users ?? []) {
    if (!u.line_user_id) continue;
    const ok = await sendLinePush(u.line_user_id, [
      textMessage(
        `✈️もうすぐ韓国旅行ですね！\n\n出発${REMINDER_DAYS}日前です。マイページでGET済みのクーポンを確認しておきましょう。\n${SITE_URL}/mypage`
      ),
    ]);
    if (ok) sent++;
  }
  return sent;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const targetDate = addDays(new Date(), REMINDER_DAYS);
  const [couponsSent, travelSent] = await Promise.all([
    notifyExpiringCoupons(targetDate),
    notifyUpcomingTravel(targetDate),
  ]);

  return NextResponse.json({ ok: true, targetDate, couponsSent, travelSent });
}
