import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/admin";
import { deletePost } from "../actions";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, title, body, created_at, user_id, users(nickname)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const post = data as unknown as {
    id: string;
    title: string;
    body: string;
    created_at: string;
    user_id: string;
    users: { nickname: string } | null;
  };

  const canDelete =
    session?.user?.id === post.user_id || isAdminEmail(session?.user?.email);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/board" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        掲示板に戻る
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{post.title}</h1>
          <p className="mt-1 text-xs text-muted">
            {post.users?.nickname} ・ {new Date(post.created_at).toISOString().slice(0, 10)}
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

      <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed shadow-sm">
        {post.body}
      </div>
    </main>
  );
}
