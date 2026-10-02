"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

// Chrome/Edge/Android 계열에만 있는 네이티브 API — jsQR 같은 별도 라이브러리 없이
// 돌아가고, 없는 브라우저에서는 버튼 자체를 숨겨서 기존 수동 입력으로만 쓰게 한다.
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const detector = new (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector({
      formats: ["qr_code"],
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              onScan(results[0].rawValue);
              setOpen(false);
              return;
            }
          } catch {
            // 한 프레임 실패는 무시하고 계속 시도
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        setError("カメラを起動できませんでした。権限設定をご確認ください。");
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onScan]);

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-body font-bold text-foreground transition hover:border-primary/40"
      >
        <Camera className="h-4 w-4" />
        QRスキャン
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {error ? (
            <p className="text-body text-white">{error}</p>
          ) : (
            <>
              <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-2xl" />
              <p className="mt-4 text-body text-white/80">QRコードを画面内に収めてください</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
