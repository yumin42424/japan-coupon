"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin";

export type NoticeFormState = { error?: string };

export async function createNotice(
  _prevState: NoticeFormState,
  formData: FormData
): Promise<NoticeFormState> {
  await requireAdmin();

  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!title) return { error: "タイトルを入力してください。(제목을 입력해주세요.)" };
  if (!body) return { error: "本文を入力してください。(내용을 입력해주세요.)" };

  const { error } = await supabaseAdmin.from("notices").insert({ title, body });

  if (error) {
    return { error: "登録に失敗しました。(등록에 실패했습니다.)" };
  }

  revalidatePath("/admin/notices");
  revalidatePath("/notices");
  return {};
}

export async function updateNotice(
  noticeId: string,
  _prevState: NoticeFormState,
  formData: FormData
): Promise<NoticeFormState> {
  await requireAdmin();

  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();

  if (!title) return { error: "タイトルを入力してください。(제목을 입력해주세요.)" };
  if (!body) return { error: "本文を入力してください。(내용을 입력해주세요.)" };

  const { error } = await supabaseAdmin
    .from("notices")
    .update({ title, body })
    .eq("id", noticeId);

  if (error) {
    return { error: "更新に失敗しました。(수정에 실패했습니다.)" };
  }

  revalidatePath("/admin/notices");
  revalidatePath("/notices");
  redirect("/admin/notices");
}

export async function deleteNotice(noticeId: string) {
  await requireAdmin();
  await supabaseAdmin.from("notices").delete().eq("id", noticeId);
  revalidatePath("/admin/notices");
  revalidatePath("/notices");
}
