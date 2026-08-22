"use client";

import { useEffect, useRef } from "react";
import { recordView } from "./actions";

// Link prefetch는 백그라운드에서 데이터만 미리 받아올 뿐 이 컴포넌트를 마운트하지 않는다.
// useEffect는 사용자가 실제로 이 화면을 렌더링(방문)했을 때만 실행되므로,
// 여기서 조회 이벤트를 기록해야 prefetch로 인한 과카운팅을 막을 수 있다.
export function ViewTracker({ couponId }: { couponId: string }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    recordView(couponId);
  }, [couponId]);

  return null;
}
