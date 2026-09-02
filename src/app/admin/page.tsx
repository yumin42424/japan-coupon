import Link from "next/link";
import { Users, Eye, Ticket, CheckCircle2, CalendarHeart, Repeat, Store, Tag, Link2, TicketCheck, Megaphone } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";

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
        管理者ダッシュボード
      </h1>

      <div className="mt-4 flex gap-2 text-sm">
        <Link
          href="/admin/stores"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Store className="h-3.5 w-3.5" />
          店舗管理
        </Link>
        <Link
          href="/admin/coupons"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Tag className="h-3.5 w-3.5" />
          クーポン管理
        </Link>
        <Link
          href="/admin/landing-pages"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Link2 className="h-3.5 w-3.5" />
          LP管理
        </Link>
        <Link
          href="/admin/redeem"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <TicketCheck className="h-3.5 w-3.5" />
          使用処理
        </Link>
        <Link
          href="/admin/notices"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-medium transition hover:border-primary/40"
        >
          <Megaphone className="h-3.5 w-3.5" />
          お知らせ管理
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} ja="会員登録数" value={totalUsers} />
        <StatCard icon={Eye} ja="クーポン閲覧数" value={viewCount} />
        <StatCard icon={Ticket} ja="クーポン発行数" value={issueCount} />
        <StatCard icon={CheckCircle2} ja="クーポン使用数" value={useCount} />
        <StatCard icon={CalendarHeart} ja="旅行予定日 登録者" value={withTravelDate} />
        <StatCard icon={Repeat} ja="再訪問率" value={`${revisitRate}%`} />
      </div>

      <Section ja="流入経路">
        <SimpleTable
          rows={[...sourceCounts.entries()].sort((a, b) => b[1] - a[1])}
          renderLabel={(key) => key}
        />
      </Section>

      <Section ja="興味カテゴリ">
        <SimpleTable
          rows={[...categoryCounts.entries()].sort((a, b) => b[1] - a[1])}
          renderLabel={(key) => {
            const c = CATEGORIES.find((x) => x.value === key);
            return c?.ja ?? key;
          }}
        />
      </Section>

      <Section ja="関心エリア（地域別会員）">
        <SimpleTable
          rows={[...areaCounts.entries()].sort((a, b) => b[1] - a[1])}
          renderLabel={(key) => {
            const a = AREAS.find((x) => x.value === key);
            return a?.ja ?? key;
          }}
        />
      </Section>

      <Section ja="旅行予定日（月別）">
        <SimpleTable rows={sortedMonths} renderLabel={(key) => key} />
      </Section>

      <Section ja="店舗別 利用状況">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-1 pr-4">
                  店舗名
                </th>
                <th className="py-1 pr-4">
                  閲覧
                </th>
                <th className="py-1 pr-4">
                  発行
                </th>
                <th className="py-1 pr-4">
                  使用
                </th>
                <th className="py-1">
                  使用率
                </th>
              </tr>
            </thead>
            <tbody>
              {[...storeStats.values()].length === 0 && (
                <tr>
                  <td className="py-2 text-muted" colSpan={5}>
                    データがありません
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
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  ja: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="h-3.5 w-3.5" />
        <span>{ja}</span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-primary">{value}</p>
    </div>
  );
}

function Section({
  ja,
  children,
}: {
  ja: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">{ja}</h2>
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
        データがありません
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
