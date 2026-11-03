import type { ReactNode } from "react";

export function SectionHeading({
  title,
  subtitle,
  align = "left",
  action,
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** 見出しの右側に置くリンク（「すべて見る」など） */
  action?: ReactNode;
}) {
  return (
    <div className={align === "center" ? "text-center" : undefined}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-h2 font-display tracking-tight">{title}</h2>
        {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
      </div>
      {subtitle && <p className="mt-1.5 text-body text-muted">{subtitle}</p>}
    </div>
  );
}
