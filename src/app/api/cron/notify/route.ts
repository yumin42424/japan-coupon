import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendLinePush, textMessage } from "@/lib/line-push";
import { addDaysKST } from "@/lib/date";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";
const REMINDER_DAYS = 3;

// 정확히 N일 후인 건만 매칭해서, 매일 도는 cron이 같은 알림을 반복해서 안 보내게 한다
// (예: "3일 남았어요"는 유효기간이 오늘+3일인 날 딱 한 번만 조건에 걸림).
// 이미 GET한 쿠폰에 대한 만료 안내라서 마케팅 동의와 무관하게 보내되,
// 비공개(demo)·중지된 쿠폰/매장은 알림 대상에서 제외한다.
// dryRun=true 이면 LINE 메시지를 보내지 않고 "보냈다면 몇 건인지"만 센다 (운영 중 안전하게 동작을 확인하기 위한 모드).
type Counts = { sent: number; failed: number };

async function notifyExpiringCoupons(targetDate: string, dryRun: boolean): Promise<Counts> {
  const { data: rows } = await supabaseAdmin
    .from("coupon_events")
    .select(
      "user_id, reissue_key, coupons!inner(id, title, valid_to, is_active, is_demo, stores!inner(name, is_active, is_demo)), users!inner(line_user_id)"
    )
    .eq("event_type", "issue")
    .eq("coupons.valid_to", targetDate)
    .eq("coupons.is_active", true)
    .eq("coupons.is_demo", false)
    .eq("coupons.stores.is_active", true)
    .eq("coupons.stores.is_demo", false);

  type Row = {
    user_id: string;
    reissue_key: string;
    coupons: { id: string; title: string; stores: { name: string } | null } | null;
    users: { line_user_id: string | null } | null;
  };

  let sent = 0;
  let failed = 0;
  for (const row of (rows ?? []) as unknown as Row[]) {
    const lineUserId = row.users?.line_user_id;
    if (!lineUserId || !row.coupons) continue;

    // 이미 사용 처리된 쿠폰은 알림 대상에서 제외 (재사용 쿠폰은 같은 사이클의 사용 기록만 본다)
    const { data: usedRow } = await supabaseAdmin
      .from("coupon_events")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("coupon_id", row.coupons.id)
      .eq("event_type", "use")
      .eq("reissue_key", row.reissue_key)
      .maybeSingle();
    if (usedRow) continue;

    if (dryRun) {
      sent++;
      continue;
    }
    const ok = await sendLinePush(lineUserId, [
      textMessage(
        `⏰もうすぐ期限切れです\n\n${row.coupons.stores?.name ?? ""}\n${row.coupons.title}\n有効期限: ${REMINDER_DAYS}日後\n\n忘れずにご利用ください！\n${SITE_URL}/mypage`
      ),
    ]);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

// 여행 임박 안내는 판촉 성격의 메시지라서 마케팅 수신에 동의한 회원에게만 보낸다.
async function notifyUpcomingTravel(targetDate: string, dryRun: boolean): Promise<Counts> {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("line_user_id")
    .eq("travel_date", targetDate)
    .not("line_user_id", "is", null)
    .not("marketing_agreed_at", "is", null);

  let sent = 0;
  let failed = 0;
  for (const u of users ?? []) {
    if (!u.line_user_id) continue;
    if (dryRun) {
      sent++;
      continue;
    }
    const ok = await sendLinePush(u.line_user_id, [
      textMessage(
        `✈️もうすぐ韓国旅行ですね！\n\n出発${REMINDER_DAYS}日前です。マイページでGET済みのクーポンを確認しておきましょう。\n${SITE_URL}/mypage`
      ),
    ]);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 인증을 통과한 요청에서만 ?dryRun=1 이 의미를 가진다: 대상 건수만 세고 메시지는 보내지 않는다.
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const targetDate = addDaysKST(REMINDER_DAYS);

  try {
    const [coupons, travel] = await Promise.all([
      notifyExpiringCoupons(targetDate, dryRun),
      notifyUpcomingTravel(targetDate, dryRun),
    ]);
    const failed = coupons.failed + travel.failed;
    if (failed > 0) {
      Sentry.captureMessage(`cron/notify: ${failed} LINE push(es) failed`, { level: "warning", tags: { area: "cron" } });
    }
    return NextResponse.json({
      ok: true,
      dryRun,
      targetDate,
      couponsSent: coupons.sent,
      travelSent: travel.sent,
      failed,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "cron" } });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
