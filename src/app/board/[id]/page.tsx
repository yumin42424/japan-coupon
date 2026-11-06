import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getIsAdmin } from "@/lib/admin";
import { BOARD_CATEGORIES } from "@/lib/board-categories";
import { deletePost } from "../actions";
import { getT } from "@/i18n/server";
import { translateRow } from "@/i18n/content";
import { POST_TEXT } from "@/i18n/content-fields";
import { AutoTranslatedNote } from "@/components/auto-translated-note";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;
  const session = await auth();

  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, title, body, category, created_at, user_id, users(nickname)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const storedPost = data as unknown as {
    id: string;
    title: string;
    body: string;
    category: string;
    created_at: string;
    user_id: string;
    users: { nickname: string } | null;
  };
  const post = await translateRow(storedPost, POST_TEXT);

  const category = BOARD_CATEGORIES.find((c) => c.value === post.category);
  const canDelete = session?.user?.id === post.user_id || (await getIsAdmin());

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/board" className="flex items-center gap-1 text-body text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        {t("Q&Aに戻る")}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          {category && (
            <span className="mb-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-label font-medium text-primary">
              {t(category.ja)}
            </span>
          )}
          <h1 className="text-h1 font-display tracking-tight">{post.title}</h1>
          <p className="mt-1 text-caption text-muted">
            {post.users?.nickname}{t(" ・ ")}{new Date(post.created_at).toISOString().slice(0, 10)}
          </p>
        </div>
        {canDelete && (
          <form action={deletePost.bind(null, post.id)}>
            <button
              type="submit"
              aria-label="delete"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary/40 hover:text-primary"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-body leading-relaxed shadow-card">
        {post.body}
      </div>
      <AutoTranslatedNote />
    </main>
  );
}
