import Link from "next/link";
import { Users, Eye, Ticket, CheckCircle2, CalendarHeart, Repeat, Store, Tag, Link2, TicketCheck, Megaphone } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { JaKo } from "@/components/ja-ko";

type UserRow = {
  id: string;
  acquisition_source: string | null;
  travel_date: string | null;
  created_at: string;
  last_login_at: string | null;
};

type CouponEventRow = {
  event_type: "view" | "issue" | "use";
  coupons: {
    store_id: string;
    stores: { id: string; name: string } | null;
  } | null;
};

const REVISIT_THRESHOLD_MS = 5 * 60 * 1000; // 가입 직후 자동로그인과 구분하기 위한 최소 간격

export default async function AdminPage() {
  const [usersRes, interestAreasRes, interestCategoriesRes, couponEventsRes] =
    await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, acquisition_source, travel_date, created_at, last_login_at"),
      supabaseAdmin.from("user_interest_areas").select("area"),
      supabaseAdmin.from("user_interest_categories").select("category"),
      supabaseAdmin
        .from("coupon_events")
        .select("event_type, coupons(store_id, stores(id, name))"),
    ]);

  const users = (usersRes.data ?? []) as UserRow[];
  const totalUsers = users.length;

  // 유입경로
  const sourceCounts = new Map<string, number>();
  for (const u of users) {
    const src = u.acquisition_source || "direct";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }

  // 관심 카테고리
  const categoryCounts = new Map<string, number>();
  for (const row of (interestCategoriesRes.data ?? []) as { category: string }[]) {
    categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
  }

  // 관심 지역 (지역별 회원 지표로 사용)
  const areaCounts = new Map<string, number>();
  for (const row of (interestAreasRes.data ?? []) as { area: string }[]) {
    areaCounts.set(row.area, (areaCounts.get(row.area) ?? 0) + 1);
  }

  // 여행예정일
  const withTravelDate = users.filter((u) => u.travel_date).length;
  const monthCounts = new Map<string, number>();
  for (const u of users) {
    if (!u.travel_date) continue;
    const month = u.travel_date.slice(0, 7); // YYYY-MM
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }
  const sortedMonths = [...monthCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  // 쿠폰 조회/발급/사용 + 업체별 집계
  const events = (couponEventsRes.data ?? []) as unknown as CouponEventRow[];
  let viewCount = 0;
  let issueCount = 0;
  let useCount = 0;
  const storeStats = new Map<
    string,
    { name: string; view: number; issue: number; use: number }
  >();

  for (const e of events) {
    if (e.event_type === "view") viewCount++;
    else if (e.event_type === "issue") issueCount++;
    else if (e.event_type === "use") useCount++;

    const store = e.coupons?.stores;
    if (store) {
      const entry =
        storeStats.get(store.id) ?? { name: store.name, view: 0, issue: 0, use: 0 };
      entry[e.event_type]++;
      storeStats.set(store.id, entry);
    }
  }

  // 재방문율 (마지막 로그인이 가입 시점보다 충분히 뒤인 회원 비율)
  const revisitors = users.filter((u) => {
    if (!u.last_login_at) return false;
    const diffMs =
      new Date(u.last_login_at).getTime() - new Date(u.created_at).getTime();
    return diffMs > REVISIT_THRESHOLD_MS;
  }).length;
  const revisitRate = totalUsers
    ? Math.round((revisitors / totalUsers) * 1000) / 10
    : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="管理者ダッシュボード" ko="관리자 대시보드" />
      </h1>

      <div className="mt-4 flex gap-2 text-sm">
        <Link
          href="/admin/stores"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Store className="h-3.5 w-3.5" />
          <JaKo ja="店舗管理" ko="매장 관리" />
        </Link>
        <Link
          href="/admin/coupons"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Tag className="h-3.5 w-3.5" />
          <JaKo ja="クーポン管理" ko="쿠폰 관리" />
        </Link>
        <Link
          href="/admin/landing-pages"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Link2 className="h-3.5 w-3.5" />
          <JaKo ja="LP管理" ko="랜딩페이지 관리" />
        </Link>
        <Link
          href="/admin/redeem"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <TicketCheck className="h-3.5 w-3.5" />
          <JaKo ja="使用処理" ko="사용 처리" />
        </Link>
        <Link
          href="/admin/notices"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Megaphone className="h-3.5 w-3.5" />
          <JaKo ja="お知らせ管理" ko="공지 관리" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} ja="会員登録数" ko="회원가입수" value={totalUsers} />
        <StatCard icon={Eye} ja="クーポン閲覧数" ko="쿠폰 조회수" value={viewCount} />
        <StatCard icon={Ticket} ja="クーポン発行数" ko="쿠폰 발급수" value={issueCount} />
        <StatCard icon={CheckCircle2} ja="クーポン使用数" ko="쿠폰 사용수" value={useCount} />
        <StatCard
          icon={CalendarHeart}
          ja="旅行予定日 登録者"
          ko="여행예정일 등록자"
          value={withTravelDate}
        />
        <StatCard icon={Repeat} ja="再訪問率" ko="재방문율" value={`${revisitRate}%`} />
      </div>

      <Section ja="流入経路" ko="유입경로">
        <SimpleTable
          rows={[...sourceCounts.entries()].sort((a, b) => b[1] - a[1])}
          renderLabel={(key) => key}
        />
      </Section>

      <Section ja="興味カテゴリ" ko="관심 카테고리">
        <SimpleTable
          rows={[...categoryCounts.entries()].sort((a, b) => b[1] - a[1])}
          renderLabel={(key) => {
            const c = CATEGORIES.find((x) => x.value === key);
            return `${c?.ja ?? key} (${c?.ko ?? key})`;
          }}
        />
      </Section>

      <Section ja="関心エリア（地域別会員）" ko="관심 지역(지역별 회원)">
        <SimpleTable
          rows={[...areaCounts.entries()].sort((a, b) => b[1] - a[1])}
          renderLabel={(key) => {
            const a = AREAS.find((x) => x.value === key);
            return `${a?.ja ?? key} (${a?.ko ?? key})`;
          }}
        />
      </Section>

      <Section ja="旅行予定日（月別）" ko="여행예정일(월별)">
        <SimpleTable rows={sortedMonths} renderLabel={(key) => key} />
      </Section>

      <Section ja="店舗別 利用状況" ko="업체별 이용현황(사용률)">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-1 pr-4">
                  <JaKo ja="店舗名" ko="매장명" />
                </th>
                <th className="py-1 pr-4">
                  <JaKo ja="閲覧" ko="조회" />
                </th>
                <th className="py-1 pr-4">
                  <JaKo ja="発行" ko="발급" />
                </th>
                <th className="py-1 pr-4">
                  <JaKo ja="使用" ko="사용" />
                </th>
                <th className="py-1">
                  <JaKo ja="使用率" ko="사용률" />
                </th>
              </tr>
            </thead>
            <tbody>
              {[...storeStats.values()].length === 0 && (
                <tr>
                  <td className="py-2 text-muted" colSpan={5}>
                    <JaKo ja="データがありません" ko="데이터가 없습니다" />
                  </td>
                </tr>
              )}
              {[...storeStats.values()].map((s) => (
                <tr key={s.name} className="border-b border-border">
                  <td className="py-1 pr-4">{s.name}</td>
                  <td className="py-1 pr-4">{s.view}</td>
                  <td className="py-1 pr-4">{s.issue}</td>
                  <td className="py-1 pr-4">{s.use}</td>
                  <td className="py-1">
                    {s.issue ? `${Math.round((s.use / s.issue) * 1000) / 10}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}

function StatCard({
  icon: Icon,
  ja,
  ko,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  ja: string;
  ko: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="h-3.5 w-3.5" />
        <span>
          {ja} ({ko})
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-primary">{value}</p>
    </div>
  );
}

function Section({
  ja,
  ko,
  children,
}: {
  ja: string;
  ko: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">
        {ja} ({ko})
      </h2>
      {children}
    </section>
  );
}

function SimpleTable({
  rows,
  renderLabel,
}: {
  rows: [string, number][];
  renderLabel: (key: string) => string;
}) {
  if (!rows.length) {
    return (
      <p className="mt-2 text-sm text-muted">
        <JaKo ja="データがありません" ko="데이터가 없습니다" />
      </p>
    );
  }
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {rows.map(([key, count]) => (
        <li
          key={key}
          className="flex justify-between border-b border-border py-1"
        >
          <span>{renderLabel(key)}</span>
          <span className="font-medium">{count}</span>
        </li>
      ))}
    </ul>
  );
}
