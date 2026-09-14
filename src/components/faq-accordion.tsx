"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type FaqItem = { q: string; a: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-bold"
            >
              {item.q}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <p className="px-5 pb-4 text-sm leading-relaxed text-foreground/80">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
