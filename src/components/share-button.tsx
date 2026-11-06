"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useT } from "@/i18n/client";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // ユーザーがシェアをキャンセルした場合など — 何もしない
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では静かに諦める
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={t("クーポンを共有")}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-foreground backdrop-blur-sm transition hover:bg-white"
    >
      {copied ? <Check className="h-5 w-5 text-success" /> : <Share2 className="h-5 w-5" />}
    </button>
  );
}
