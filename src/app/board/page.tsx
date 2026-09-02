import Link from "next/link";
import { MessagesSquare, ChevronRight, PenSquare } from "lucide-react";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PostRow = {
  id: string;
  title: string;
  created_at: string;
  users: { nickname: string } | null;
};

export default async function BoardPage() {
  const session = await auth();

  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, title, created_at, users(nickname)")
    .order("created_at", { ascending: false })
    .limit(50);

  const posts = (data ?? []) as unknown as PostRow[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <MessagesSquare className="h-6 w-6 text-primary" />
          自由掲示板
        </h1>
        <Link
          href={session?.user ? "/board/write" : "/login"}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <PenSquare className="h-4 w-4" />
          投稿する
        </Link>
      </div>

      <ul className="mt-8 flex flex-col gap-2">
        {posts.length === 0 && (
          <p className="text-sm text-muted">
            まだ投稿がありません。
          </p>
        )}
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/board/${post.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{post.title}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {post.users?.nickname} ・ {new Date(post.created_at).toISOString().slice(0, 10)}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
