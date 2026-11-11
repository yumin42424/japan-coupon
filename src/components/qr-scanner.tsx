"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useT } from "@/i18n/client";

// 카메라로 쿠폰 QR을 읽는다. 브라우저에 QR 인식 기능(BarcodeDetector: Android Chrome 등)이 있으면 그것을 쓰고,
// 없으면(아이폰 Safari, Windows PC 등) jsQR 로 영상 프레임을 직접 읽는다. jsQR 은 이 버튼을 눌렀을 때만 내려받는다.
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};
type BarcodeDetectorClass = {
  new (opts: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};
type Detect = (video: HTMLVideoElement) => Promise<string | null>;

const SCAN_INTERVAL_MS = 120;
const MAX_FRAME_SIDE = 720;

async function createDetector(): Promise<Detect> {
  const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      const formats = (await Native.getSupportedFormats?.()) ?? ["qr_code"];
      if (formats.includes("qr_code")) {
        const detector = new Native({ formats: ["qr_code"] });
        return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
      }
    } catch {
      // 기기가 지원하지 않으면 아래 jsQR 로 읽는다
    }
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    const { videoWidth: width, videoHeight: height } = video;
    if (!context || !width || !height) return null;
    const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // 부모가 리렌더될 때마다 onScan 함수가 새로 만들어져도 카메라가 다시 켜지지 않게 최신 값만 ref로 들고 있는다.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // 카메라 API가 없는 환경(http 등)은 버튼 클릭 시점에 안내를 띄우므로(아래 onClick), 여기서는 아무것도 하지 않는다.
    if (!open || !navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        const [detect, media] = await Promise.all([
          createDetector(),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
        ]);
        stream = media;
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play().catch(() => {});

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const value = await detect(videoRef.current);
            if (value && !cancelled) {
              onScanRef.current(value);
              setOpen(false);
              return;
            }
          } catch {
            // 한 프레임 실패는 무시하고 계속 시도
          }
          timer = setTimeout(tick, SCAN_INTERVAL_MS);
        };
        tick();
      } catch {
        if (!cancelled) setError("カメラを起動できませんでした。権限設定をご確認いただくか、コードを直接入力してください。");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // http 등 보안 컨텍스트가 아니면 navigator.mediaDevices 자체가 없다 — 화면이 깨지지 않게 안내만 띄운다.
          setError(
            typeof navigator.mediaDevices?.getUserMedia === "function"
              ? null
              : "このブラウザではカメラを使用できません。コードを直接入力してください。"
          );
          setOpen(true);
        }}
        className="flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-body font-bold text-foreground transition hover:border-primary/40"
      >
        <Camera className="h-4 w-4" />
        {t("QRスキャン")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("閉じる")}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {error ? (
            <p className="text-body text-white">{t(error)}</p>
          ) : (
            <>
              <video ref={videoRef} muted playsInline autoPlay className="w-full max-w-sm rounded-2xl" />
              <p className="mt-4 text-body text-white/80">{t("QRコードを画面内に収めてください")}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
