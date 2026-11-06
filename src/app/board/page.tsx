import Link from "next/link";
import { ChevronRight, PenSquare } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { BOARD_CATEGORIES, isBoardCategory } from "@/lib/board-categories";
import { getT } from "@/i18n/server";
import { translateRows } from "@/i18n/content";

type PostRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  users: { nickname: string } | null;
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const t = await getT();
  const session = await auth();
  const { category: categoryParam } = await searchParams;
  const activeCategory = isBoardCategory(categoryParam) ? categoryParam : undefined;

  let query = supabaseAdmin
    .from("posts")
    .select("id, title, category, created_at, users(nickname)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }

  const { data } = await query;
  const posts = await translateRows((data ?? []) as unknown as PostRow[], ["title"]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-display tracking-tight">{t("韓国旅行Q&A")}</h1>
        <Link
          href={session?.user ? "/board/write" : "/login"}
          className="btn-glossy flex items-center gap-1.5 rounded-lg px-4 py-2 text-caption font-bold text-primary-foreground transition hover:brightness-105"
        >
          <PenSquare className="h-4 w-4" />
          {t("投稿する")}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <Link
          href="/board"
          className={`rounded-lg px-3 py-1.5 text-caption font-medium transition ${
            !activeCategory
              ? "btn-glossy border-transparent text-primary-foreground"
              : "border border-border bg-card text-muted hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {t("すべて")}
        </Link>
        {BOARD_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/board?category=${c.value}`}
            className={`rounded-lg px-3 py-1.5 text-caption font-medium transition ${
              activeCategory === c.value
                ? "btn-glossy border-transparent text-primary-foreground"
                : "border border-border bg-card text-muted hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {t(c.ja)}
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="mt-6 border-y border-border py-8 text-body text-muted">
          {t("まだ投稿がありません。韓国旅行で気になることを、最初に質問してみませんか。")}
        </p>
      )}
      <ul className="mt-6 flex flex-col gap-2">
        {posts.map((post) => {
          const category = BOARD_CATEGORIES.find((c) => c.value === post.category);
          return (
            <li key={post.id}>
              <Link
                href={`/board/${post.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    {category && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-label font-medium text-primary">
                        {t(category.ja)}
                      </span>
                    )}
                    <span className="truncate text-h3">{post.title}</span>
                  </span>
                  <span className="mt-0.5 block text-caption text-muted">
                    {post.users?.nickname}{t(" ・ ")}{new Date(post.created_at).toISOString().slice(0, 10)}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
