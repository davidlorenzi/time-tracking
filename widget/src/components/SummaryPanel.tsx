import { useEffect, useState } from "react";

import { localISODate, monthRangeContaining, weekRangeContaining } from "../lib/dates";
import { fetchSummary, type PeriodTotals } from "../lib/queries";

const moneyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function formatMoney(n: number) {
  return moneyFormatter.format(n);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--subtle)]">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PeriodCard({
  title,
  totals,
}: {
  title: string;
  totals: PeriodTotals | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--control-border)] bg-[var(--control-bg)] p-3">
      <p className="col-span-2 text-sm font-medium text-[var(--foreground)]">
        {title}
      </p>
      <Stat label="Hours" value={(totals?.hours ?? 0).toFixed(1)} />
      <Stat label="Revenue" value={formatMoney(totals?.revenue ?? 0)} />
    </div>
  );
}

export function SummaryPanel({ refreshKey }: { refreshKey: number }) {
  const [today, setToday] = useState<PeriodTotals | null>(null);
  const [week, setWeek] = useState<PeriodTotals | null>(null);
  const [month, setMonth] = useState<PeriodTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const day = localISODate();
    const now = new Date();
    const { from: weekFrom, to: weekTo } = weekRangeContaining(now);
    const { from: monthFrom, to: monthTo } = monthRangeContaining(now);
    setError(null);
    Promise.all([
      fetchSummary(day, day),
      fetchSummary(weekFrom, weekTo),
      fetchSummary(monthFrom, monthTo),
    ])
      .then(([t, w, m]) => {
        setToday(t);
        setWeek(w);
        setMonth(m);
      })
      .catch((err) => setError(err.message));
  }, [refreshKey]);

  if (error) return <p className="p-3 text-sm text-red-600">{error}</p>;

  return (
    <div className="flex flex-1 flex-col justify-center gap-2.5 p-3">
      <PeriodCard title="Today" totals={today} />
      <PeriodCard title="This week" totals={week} />
      <PeriodCard title="This month" totals={month} />
    </div>
  );
}
