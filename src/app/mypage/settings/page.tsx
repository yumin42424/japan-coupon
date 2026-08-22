import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { JaKo } from "@/components/ja-ko";
import { NicknameForm, PasswordForm } from "./settings-forms";

export default async function MyPageSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("nickname, password_hash")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="アカウント設定" ko="계정 설정" />
      </h1>

      <div className="mt-6 flex flex-col gap-6">
        <NicknameForm currentNickname={user.nickname} />
        <PasswordForm hasPassword={!!user.password_hash} />
      </div>
    </main>
  );
}
