import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarHeart } from "lucide-react";
import { auth } from "@/auth";
import { saveOnboarding } from "./actions";
import { JaKo } from "@/components/ja-ko";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight">
        <JaKo ja="韓国旅行について教えてください" ko="한국 여행에 대해 알려주세요" />
      </h1>
      <p className="mt-2 text-sm text-muted">
        <JaKo
          ja="興味に合わせて、お得なクーポンをご紹介します。"
          ko="관심사에 맞춰 알뜰한 쿠폰을 소개해드려요."
        />
      </p>

      <form action={saveOnboarding} className="mt-8 flex flex-col gap-8">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <CalendarHeart className="h-4 w-4 text-primary" />
            <JaKo ja="韓国旅行の予定日" ko="한국 여행 예정일" />
          </span>
          <input
            type="date"
            name="travelDate"
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">
            <JaKo ja="どんな情報に興味がありますか？" ko="어떤 정보에 관심 있으신가요?" />
          </legend>
          <div className="flex flex-wrap gap-2 text-sm">
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.value];
              return (
                <label
                  key={category.value}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 font-medium transition has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary"
                >
                  <input
                    type="checkbox"
                    name="categories"
                    value={category.value}
                    className="sr-only"
                  />
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                  <JaKo ja={category.ja} ko={category.ko} />
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">
            <JaKo ja="主に行きたいエリアは？" ko="주로 가고 싶은 지역은?" />
          </legend>
          <div className="flex flex-wrap gap-2 text-sm">
            {AREAS.map((area) => (
              <label
                key={area.value}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 font-medium transition has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary"
              >
                <input type="checkbox" name="areas" value={area.value} className="sr-only" />
                <AreaIcon className="h-4 w-4" strokeWidth={2.25} />
                <JaKo ja={area.ja} ko={area.ko} />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-xl hover:shadow-primary/30"
          >
            <JaKo ja="保存する" ko="저장하기" />
          </button>
          <Link href="/" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
            <JaKo ja="あとで設定する" ko="나중에 설정할게요" />
          </Link>
        </div>
      </form>
    </main>
  );
}
