"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

// 매장 직원에게 보여줄 QR코드. 클라이언트에서 캔버스로 직접 그리기 때문에
// 페이지를 한 번 로드해두면 이후엔 인터넷 연결 없이도(로밍이 끊겨도) 보여줄 수 있다.
export function CouponQR({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, code, { width: 160, margin: 1 }).catch(() => {});
  }, [code]);

  return <canvas ref={canvasRef} className="rounded-lg bg-white p-2" />;
}
