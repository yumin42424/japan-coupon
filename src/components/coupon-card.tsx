import Image from "next/image";
import Link from "next/link";
import { Flame, Lock, Timer, LocateFixed, Star } from "lucide-react";
import { CATEGORIES, AREAS, type CategoryValue, type AreaValue } from "@/lib/taxonomy";
import { CATEGORY_ICONS } from "@/lib/taxonomy-icons";
import { CATEGORY_IMAGES } from "@/lib/taxonomy-images";

export type CouponCardProps = {
  href: string;
  category: CategoryValue;
  area?: AreaValue;
  storeName: string;
  /** クーポンのタイトル/割引内容 — カード内で最も目立たせる要素 */
  benefit: string;
  discountRate?: number | null;
  memberOnly?: boolean;
  popularWithJapanese?: boolean;
  urgent?: boolean;
  daysLeft?: number;
  /** /nearby でのみ使用 */
  distance?: string;
  /** レビューの平均評価 — 実データがある店舗のみ渡す */
  rating?: { avg: number; count: number };
  className?: string;
};

/**
 * サイト全体のクーポンカードの唯一の実装。
 * ホーム・クーポン一覧・エリア・おすすめ・現在地から、すべてここを共有する。
 */
export function CouponCard({
  href,
  category,
  area,
  storeName,
  benefit,
  discountRate,
  memberOnly,
  popularWithJapanese,
  urgent,
  daysLeft,
  distance,
  rating,
  className,
}: CouponCardProps) {
  const categoryInfo = CATEGORIES.find((c) => c.value === category);
  const areaInfo = area ? AREAS.find((a) => a.value === area) : undefined;
  const Icon = CATEGORY_ICONS[category];
  const image = CATEGORY_IMAGES[category];

  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated ${className ?? ""}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary/10">
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />
        <span className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-soft">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        {(urgent || memberOnly) && (
          <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
            {urgent && daysLeft != null && (
              <span className="flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-label font-bold text-primary-foreground">
                <Timer className="h-2.5 w-2.5" />
                {daysLeft <= 0 ? "本日締切" : `あと${daysLeft}日`}
              </span>
            )}
            {memberOnly && (
              <span className="flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-label font-semibold text-primary">
                <Lock className="h-2.5 w-2.5" />
                会員限定
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-3.5">
        <p className="flex items-center gap-1 text-caption text-muted">
          <span className="min-w-0 truncate">
            {categoryInfo?.ja}
            {areaInfo && ` ・ ${areaInfo.ja}`}
          </span>
          {rating && (
            <span className="flex shrink-0 items-center gap-0.5 font-semibold text-foreground">
              <Star className="h-3 w-3 text-primary" fill="currentColor" strokeWidth={0} />
              {rating.avg.toFixed(1)}
            </span>
          )}
          {distance && (
            <span className="ml-auto flex shrink-0 items-center gap-0.5 font-semibold text-primary">
              <LocateFixed className="h-3 w-3" />
              {distance}
            </span>
          )}
        </p>
        <p className="mt-1 flex items-center gap-1 truncate text-caption font-medium text-foreground/70">
          {storeName}
          {popularWithJapanese && <Flame className="h-3 w-3 shrink-0 text-orange-500" />}
        </p>
        <p className="mt-0.5 line-clamp-2 text-h3 font-extrabold leading-snug text-primary">
          {benefit}
        </p>
        {discountRate != null && (
          <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-caption font-bold text-primary">
            -{discountRate}%
          </span>
        )}
      </div>
    </Link>
  );
}
