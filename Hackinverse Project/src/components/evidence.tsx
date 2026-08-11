import { cn } from "@/lib/utils";

export function EvidenceRow({
  label,
  value,
  mono = true,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="label-mono sm:w-40 sm:shrink-0">{label}</span>
      <span
        className={cn(
          "min-w-0 break-all text-sm",
          mono && "font-mono text-xs",
          tone === "good" && "text-primary",
          tone === "bad" && "text-destructive",
          tone === "warn" && "text-warning",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function EvidencePanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-card", className)}>
      <header className="border-b border-border px-4 py-2.5">
        <h2 className="label-mono">{title}</h2>
      </header>
      <div className="px-4 py-1">{children}</div>
    </section>
  );
}
