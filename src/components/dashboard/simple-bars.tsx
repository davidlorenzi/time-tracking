import { cn } from "@/lib/cn";

export type BarItem = { key: string; label: string; value: number };

type SimpleBarsProps = {
  items: BarItem[];
  valueSuffix?: string;
  className?: string;
};

export function SimpleBars({
  items,
  valueSuffix = "h",
  className,
}: SimpleBarsProps) {
  const max = Math.max(0.01, ...items.map((i) => i.value));

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
          <span className="w-14 shrink-0 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
            {i.value.toFixed(1)}
            {valueSuffix}
          </span>
        </li>
      ))}
    </ul>
  );
}
