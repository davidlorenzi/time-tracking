import { cn } from "@/lib/cn";

export type BarItem = {
  key: string;
  label: string;
  value: number;
  /** When set, shown next to hours (e.g. estimated revenue for client/project breakdown). */
  revenue?: number;
};

type SimpleBarsProps = {
  items: BarItem[];
  valueSuffix?: string;
  className?: string;
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SimpleBars({
  items,
  valueSuffix = "h",
  className,
}: SimpleBarsProps) {
  const max = Math.max(0.01, ...items.map((i) => i.value));
  const showRevenue = items.some((i) => i.revenue !== undefined);

  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No data.</p>
    );
  }

  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-2 text-sm">
          <span
            className="w-[36%] max-w-[11rem] shrink-0 truncate text-zinc-600 dark:text-zinc-300"
            title={i.label}
          >
            {i.label}
          </span>
          <div className="h-2 min-w-0 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-2 max-w-full rounded-full bg-zinc-700 dark:bg-zinc-300"
              style={{ width: `${Math.min(100, (i.value / max) * 100)}%` }}
            />
          </div>
          <div
            className={cn(
              "shrink-0 text-right tabular-nums text-zinc-500 dark:text-zinc-400",
              showRevenue ? "w-[5.5rem]" : "w-14",
            )}
          >
            <div>
              {i.value.toFixed(1)}
              {valueSuffix}
            </div>
            {showRevenue ? (
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {i.revenue !== undefined ? formatMoney(i.revenue) : "—"}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
