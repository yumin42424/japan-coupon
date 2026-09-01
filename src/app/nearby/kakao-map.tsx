"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type LatLng = { lat: number; lng: number };
type MarkerInput = LatLng & { label?: string };

type KakaoMaps = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => unknown;
  Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
  Marker: new (options: { position: unknown; map?: unknown }) => { setMap: (map: unknown) => void };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export function KakaoMap({ center, markers }: { center: LatLng; markers: MarkerInput[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // 서버 렌더링 시점엔 window가 없으므로, 하이드레이션 불일치를 피하기 위해
  // 초기값은 항상 false로 통일하고 실제 판단은 effect에서만 한다.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.kakao?.maps) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;
    if (!kakao) return;

    kakao.maps.load(() => {
      if (!mapRef.current) return;
      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 6,
      });
      new kakao.maps.Marker({ position: new kakao.maps.LatLng(center.lat, center.lng), map });
      markers.forEach((m) => {
        new kakao.maps.Marker({ position: new kakao.maps.LatLng(m.lat, m.lng), map });
      });
    });
  }, [ready, center, markers]);

  if (!KAKAO_KEY) return null;

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-2xl border border-border" />
    </>
  );
}
