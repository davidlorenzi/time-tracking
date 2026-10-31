import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Percentage change vs previous period; positive is good by default. */
  delta?: number | null;
  invertDelta?: boolean;
  className?: string;
};

export function StatCard({ label, value, hint, delta, invertDelta, className }: StatCardProps) {
  const good = delta == null ? null : invertDelta ? delta <= 0 : delta >= 0;
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {delta != null && Number.isFinite(delta) ? (
          <span className={cn("font-medium", good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
          </span>
        ) : null}
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}
