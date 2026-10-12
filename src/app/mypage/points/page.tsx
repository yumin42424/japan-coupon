import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Coins, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDateTimeKST } from "@/lib/date";
import { POINT_UI_VISIBLE, POINT_USE_OPTIONS, POINTS_PER_USE, isPointUseAvailable } from "@/lib/point-policy";
import { PointUsePanel } from "./point-use-panel";

export const metadata: Metadata = {
  title: "ポイント",
  robots: { index: false, follow: false },
};

type PointRow = {
  points: number;
  reason: string | null;
  created_at: string;
  coupons: { title: string; stores: { name: string } | null } | null;
};

const HISTORY_LIMIT = 100;

export default async function PointsPage() {
  if (!POINT_UI_VISIBLE) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/mypage/points")}`);
  }

  const { data } = await supabaseAdmin
    .from("point_events")
    .select("points, reason, created_at, coupons(title, stores(name))")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as PointRow[];
  const balance = rows.reduce((sum, r) => sum + r.points, 0);
  const earned = rows.filter((r) => r.points > 0);
  const used = rows.filter((r) => r.points < 0);

  const label = (r: PointRow) => {
    const base = r.reason ?? (r.points > 0 ? "ポイント獲得" : "ポイント利用");
    const store = r.coupons?.stores?.name;
    return store ? `${base}（${store}）` : base;
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/mypage" className="flex items-center gap-1 text-body text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        マイページに戻る
      </Link>

      <h1 className="text-h1 font-display mt-3 tracking-tight">ポイント</h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-elevated">
        <p className="text-caption text-muted">現在の保有ポイント</p>
        <p className="mt-1 flex items-center gap-2 text-display font-bold text-primary">
          <Coins className="h-7 w-7" />
          {balance.toLocaleString()}
          <span className="text-body font-normal text-muted">ポイント</span>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-caption">
          <div>
            <dt className="text-muted">利用可能なポイント</dt>
            <dd className="mt-0.5 text-body font-bold">{balance.toLocaleString()}pt</dd>
          </div>
          <div>
            <dt className="text-muted">獲得方法</dt>
            <dd className="mt-0.5 text-body">クーポンを店舗で利用すると{POINTS_PER_USE}pt</dd>
          </div>
        </dl>
      </section>

      <PointUsePanel
        balance={balance}
        enabled={isPointUseAvailable()}
        options={POINT_USE_OPTIONS.filter((o) => o.enabled).map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description,
          cost: o.cost,
        }))}
      />

      <HistorySection
        icon={<ArrowDownLeft className="h-5 w-5 text-success" />}
        title="獲得履歴"
        empty="まだポイントの獲得履歴はありません。"
        items={earned.slice(0, HISTORY_LIMIT).map((r) => ({
          key: `${r.created_at}-e-${r.points}-${label(r)}`,
          label: label(r),
          date: formatDateTimeKST(r.created_at),
          points: r.points,
        }))}
      />
      <HistorySection
        icon={<ArrowUpRight className="h-5 w-5 text-primary" />}
        title="利用履歴"
        empty="まだポイントの利用履歴はありません。"
        items={used.slice(0, HISTORY_LIMIT).map((r) => ({
          key: `${r.created_at}-u-${r.points}-${label(r)}`,
          label: label(r),
          date: formatDateTimeKST(r.created_at),
          points: r.points,
        }))}
      />
    </main>
  );
}

function HistorySection({
  icon,
  title,
  empty,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  items: { key: string; label: string; date: string; points: number }[];
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-h3">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-body text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={`${item.key}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-body">{item.label}</p>
                <p className="text-caption text-muted">{item.date}</p>
              </div>
              <p className={`shrink-0 text-body font-bold ${item.points > 0 ? "text-success" : "text-primary"}`}>
                {item.points > 0 ? "+" : ""}
                {item.points.toLocaleString()}pt
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
