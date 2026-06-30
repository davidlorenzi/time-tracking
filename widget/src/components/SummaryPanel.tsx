import { useEffect, useState } from "react";

import { localISODate, weekRangeContaining } from "../lib/dates";
import { fetchSummary, type PeriodTotals } from "../lib/queries";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function SummaryPanel({ refreshKey }: { refreshKey: number }) {
  const [today, setToday] = useState<PeriodTotals | null>(null);
  const [week, setWeek] = useState<PeriodTotals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualRefreshKey, setManualRefreshKey] = useState(0);

  useEffect(() => {
    const day = localISODate();
    const { from, to } = weekRangeContaining(new Date());
    setLoading(true);
    setError(null);
    Promise.all([fetchSummary(day, day), fetchSummary(from, to)])
      .then(([t, w]) => {
        setToday(t);
        setWeek(w);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, manualRefreshKey]);

  return (
    <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Summary
        </p>
        <button
          type="button"
          onClick={() => setManualRefreshKey((k) => k + 1)}
          disabled={loading}
          aria-label="Refresh summary"
          className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0114.5-3.5M19.5 15a8 8 0 01-14.5 3.5"
            />
          </svg>
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Today
            </p>
            <Stat label="Hours" value={(today?.hours ?? 0).toFixed(1)} />
            <Stat label="Revenue" value={formatMoney(today?.revenue ?? 0)} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              This week
            </p>
            <Stat label="Hours" value={(week?.hours ?? 0).toFixed(1)} />
            <Stat label="Revenue" value={formatMoney(week?.revenue ?? 0)} />
          </div>
        </div>
      )}
    </div>
  );
}
