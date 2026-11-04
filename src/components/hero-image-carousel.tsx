"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HeroImageCarousel({
  images,
}: {
  images: { src: string; label: string }[];
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (images.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 4000);
  }, [images.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  // 수동으로 넘겼을 때는 자동 전환 타이머를 그 시점부터 다시 4초로 재시작한다 —
  // 그래야 클릭 직후 곧바로 또 넘어가는 어색한 타이밍이 안 생긴다.
  // setIndex는 항상 함수형 업데이트로 호출한다 — 화살표를 빠르게 연속 클릭하면
  // 리렌더 전에 onClick이 겹쳐 실행될 수 있는데, 그때 바깥의 index를 직접 읽으면
  // 두 번째 클릭이 오래된 값을 보고 계산해서 제자리로 돌아가버린다.
  const shiftTo = (updater: (i: number) => number) => {
    setIndex((i) => ((updater(i) % images.length) + images.length) % images.length);
    startTimer();
  };
  const goTo = (i: number) => shiftTo(() => i);
  const prev = () => shiftTo((i) => i - 1);
  const next = () => shiftTo((i) => i + 1);

  return (
    <div className="group/carousel relative h-full w-full">
      {images.map((image, i) => (
        <Image
          key={image.src}
          src={image.src}
          alt=""
          fill
          sizes="45vw"
          priority={i === 0}
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="前の写真"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 group-hover/carousel:opacity-100 focus-visible:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="次の写真"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 group-hover/carousel:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* いま表示している写真のエリア名（写真の説明として。下側だけ薄く暗くして文字を読みやすくする） */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
      <p className="absolute bottom-3.5 left-4 text-body font-bold text-white">{images[index]?.label}</p>

      <div className="absolute bottom-0 right-0 flex p-1.5">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => goTo(i)}
            aria-label={image.label}
            aria-current={i === index}
            className="flex h-8 min-w-8 items-center justify-center px-1"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-500 ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
