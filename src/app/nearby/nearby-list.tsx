"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LocateFixed, AlertCircle } from "lucide-react";
import { CATEGORIES, AREAS } from "@/lib/taxonomy";
import { distanceKm, formatDistance } from "@/lib/geo";
import { CouponCard } from "@/components/coupon-card";
import { EmptyState } from "@/components/empty-state";
import { KakaoMap } from "./kakao-map";
import type { NearbyCoupon } from "./page";

type Status = "loading" | "granted" | "denied" | "unsupported" | "error";

const STATUS_MESSAGE: Record<"denied" | "unsupported" | "error", string> = {
  denied: "位置情報の利用が許可されていません。ブラウザの設定から位置情報を許可してください。",
  unsupported: "このブラウザでは位置情報を利用できません。",
  error: "現在地を取得できませんでした。もう一度お試しください。",
};

export function NearbyList({ coupons }: { coupons: NearbyCoupon[] }) {
  // 서버 렌더링 시점엔 navigator가 없으므로, 하이드레이션 불일치를 피하기 위해
  // 초기 상태는 항상 "loading"으로 통일하고 실제 판단은 아래 effect에서만 한다.
  const [status, setStatus] = useState<Status>("loading");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      const timer = setTimeout(() => setStatus("unsupported"), 0);
      return () => clearTimeout(timer);
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setStatus("granted");
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  if (status === "loading") {
    return (
      <div className="mt-8 flex items-center gap-2 text-body text-muted">
        <LocateFixed className="h-4 w-4 animate-pulse" />
        現在地を取得しています…
      </div>
    );
  }

  if (status === "denied" || status === "unsupported" || status === "error") {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border py-10 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-3 text-body text-muted">{STATUS_MESSAGE[status]}</p>
        <Link
          href="/coupons"
          className="mt-4 inline-block text-body font-medium text-primary underline underline-offset-4"
        >
          カテゴリから探す
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

      {withDistance.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="近くにクーポンがありません。" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {withDistance.map((coupon) => (
            <CouponCard
              key={coupon.id}
              href={`/coupons/${coupon.id}`}
              category={coupon.stores.category as (typeof CATEGORIES)[number]["value"]}
              area={coupon.stores.area as (typeof AREAS)[number]["value"]}
              storeName={coupon.stores.name}
              benefit={coupon.title}
              memberOnly={coupon.member_only}
              distance={formatDistance(coupon.distance)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
