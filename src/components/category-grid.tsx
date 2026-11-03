import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/lib/taxonomy";
import { CATEGORY_IMAGES } from "@/lib/taxonomy-images";

// 홈과 쿠폰 찾기 화면이 같이 쓰는 카테고리 타일 (사진 4:3 + 아래 이름).
export function CategoryGrid() {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-x-4">
      {CATEGORIES.map((c) => (
        <li key={c.value}>
          <Link href={`/coupons?category=${c.value}`} className="group block rounded-xl">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-background-alt">
              <Image
                src={CATEGORY_IMAGES[c.value]}
                alt=""
                fill
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 22vw, 45vw"
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              />
            </div>
            <span className="mt-2 block text-body font-bold leading-snug group-hover:text-primary">{c.ja}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
