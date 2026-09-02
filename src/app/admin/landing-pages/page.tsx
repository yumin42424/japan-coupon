import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { LandingPageForm } from "./landing-page-form";
import { DeleteLandingPageButton } from "./delete-landing-page-button";

type LandingPageRow = {
  id: string;
  slug: string;
  utm_source: string | null;
  utm_campaign: string | null;
  target_category: string | null;
  target_area: string | null;
};

export default async function AdminLandingPagesPage() {
  const { data } = await supabaseAdmin
    .from("landing_pages")
    .select("id, slug, utm_source, utm_campaign, target_category, target_area")
    .order("created_at", { ascending: false });
  const landingPages = (data ?? []) as LandingPageRow[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        ランディングページ管理
      </h1>
      <p className="mt-2 text-sm text-muted">
        広告ごとに専用ページを作って、流入経路別のCTRを測定できます。
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold">
          新しいランディングページを作成
        </h2>
        <LandingPageForm />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">
          作成済み ({landingPages.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {landingPages.length === 0 && (
            <p className="text-sm text-muted">
              まだありません
            </p>
          )}
          {landingPages.map((lp) => {
            const c = CATEGORIES.find((x) => x.value === lp.target_category);
            const a = AREAS.find((x) => x.value === lp.target_area);
            return (
              <li
                key={lp.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/lp/${lp.slug}`}
                    target="_blank"
                    className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    /lp/{lp.slug}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <p className="text-xs text-muted">
                    utm_source={lp.utm_source ?? "-"} ・ utm_campaign={lp.utm_campaign ?? "-"} ・{" "}
                    {c ? c.ja : "全カテゴリ"} ・{" "}
                    {a ? a.ja : "全エリア"}
                  </p>
                </div>
                <DeleteLandingPageButton id={lp.id} />
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
