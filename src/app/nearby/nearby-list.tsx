"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock, LocateFixed, AlertCircle } from "lucide-react";
import { CATEGORY_ICONS, AreaIcon } from "@/lib/taxonomy-icons";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { distanceKm, formatDistance } from "@/lib/geo";
import { JaKo } from "@/components/ja-ko";
import { KakaoMap } from "./kakao-map";
import type { NearbyCoupon } from "./page";

type Status = "loading" | "granted" | "denied" | "error";

export function NearbyList({ coupons }: { coupons: NearbyCoupon[] }) {
  // 서버 렌더링 시점엔 navigator가 없으므로, 하이드레이션 불일치를 피하기 위해
  // 초기 상태는 항상 "loading"으로 통일하고 실제 판단은 아래 effect에서만 한다.
  const [status, setStatus] = useState<Status>("loading");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      const timer = setTimeout(() => setStatus("error"), 0);
      return () => clearTimeout(timer);
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  if (status === "loading") {
    return (
      <div className="mt-8 flex items-center gap-2 text-sm text-muted">
        <LocateFixed className="h-4 w-4 animate-pulse" />
        <JaKo ja="現在地を取得しています…" ko="현재 위치를 확인하는 중…" />
      </div>
    );
  }

  if (status === "denied" || status === "error") {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border py-10 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-3 text-sm text-muted">
          <JaKo
            ja="位置情報の利用が許可されていません。ブラウザの設定から許可してください。"
            ko="위치 정보 사용이 허용되지 않았어요. 브라우저 설정에서 허용해주세요."
          />
        </p>
        <Link
          href="/coupons"
          className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          <JaKo ja="カテゴリから探す" ko="카테고리로 찾기" />
        </Link>
      </div>
    );
  }

  const withDistance = coupons
    .map((c) => ({
      ...c,
      distance: distanceKm(pos!.lat, pos!.lng, c.stores.latitude, c.stores.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="mt-6">
      <KakaoMap
        center={pos!}
        markers={withDistance.map((c) => ({
          lat: c.stores.latitude,
          lng: c.stores.longitude,
          label: c.stores.name,
        }))}
      />

      <ul className="mt-4 flex flex-col gap-3">
        {withDistance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted">
              <JaKo ja="近くにクーポンがありません。" ko="근처에 쿠폰이 없습니다." />
            </p>
          </div>
        ) : (
          withDistance.map((coupon) => {
            const c = CATEGORIES.find((x) => x.value === coupon.stores.category);
            const a = AREAS.find((x) => x.value === coupon.stores.area);
            const Icon = c ? CATEGORY_ICONS[c.value] : null;
            return (
              <li key={coupon.id}>
                <Link
                  href={`/coupons/${coupon.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {Icon && <Icon className="h-6 w-6" strokeWidth={2} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <span>{c?.ja}({c?.ko})</span>
                      <span>・</span>
                      <span className="flex items-center gap-0.5">
                        <AreaIcon className="h-3 w-3" />
                        {a?.ja}({a?.ko})
                      </span>
                      <span className="ml-1 flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                        <LocateFixed className="h-2.5 w-2.5" />
                        {formatDistance(coupon.distance)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="truncate font-medium">{coupon.stores.name}</span>
                      {coupon.member_only && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          <Lock className="h-2.5 w-2.5" />
                          <JaKo ja="会員限定" ko="회원 전용" />
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-lg font-bold text-primary">{coupon.title}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
