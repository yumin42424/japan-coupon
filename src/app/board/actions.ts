"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminEmail } from "@/lib/admin";

export type PostFormState = { error?: string };

export async function createPost(
  _prevState: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!title) return { error: "タイトルを入力してください。" };
  if (!body) return { error: "本文を入力してください。" };

  const { data: created, error } = await supabaseAdmin
    .from("posts")
    .insert({ user_id: session.user.id, title, body })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "投稿に失敗しました。" };
  }

  revalidatePath("/board");
  redirect(`/board/${created.id}`);
}

export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user) return;

  const { data: post } = await supabaseAdmin
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return;

  const canDelete = post.user_id === session.user.id || isAdminEmail(session.user.email);
  if (!canDelete) return;

  await supabaseAdmin.from("posts").delete().eq("id", postId);
  revalidatePath("/board");
  redirect("/board");
}
