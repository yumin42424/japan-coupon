import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { JaKo } from "@/components/ja-ko";
import { PostForm } from "./post-form";

export default async function WritePostPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="投稿する" ko="글쓰기" />
      </h1>
      <div className="mt-6">
        <PostForm />
      </div>
    </main>
  );
}
