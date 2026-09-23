import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  message,
  ctaLabel,
  ctaHref,
}: {
  icon?: LucideIcon;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      {Icon && <Icon className="mx-auto h-6 w-6 text-muted" />}
      <p className="mt-2 text-body text-muted">{message}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-4 inline-block text-body font-medium text-primary underline underline-offset-4"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
