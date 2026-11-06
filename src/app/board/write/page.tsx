import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PostForm } from "./post-form";
import { getT } from "@/i18n/server";

export default async function WritePostPage() {
  const t = await getT();
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-h1 font-display tracking-tight">
        {t("投稿する")}
      </h1>
      <div className="mt-6">
        <PostForm />
      </div>
    </main>
  );
}
