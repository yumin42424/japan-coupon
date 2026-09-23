export function SectionHeading({
  title,
  subtitle,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : undefined}>
      <h2 className="text-h2 font-display tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1.5 text-body text-muted">{subtitle}</p>}
    </div>
  );
}
