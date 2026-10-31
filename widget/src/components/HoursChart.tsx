import { useEffect, useMemo, useState } from "react";

import { lastNDays, localISODate, parseISODate } from "../lib/dates";
import {
  deleteTimeEntry,
  fetchEntriesBetween,
  type DayEntry,
} from "../lib/queries";

const DAYS = 7;
const CHART_HEIGHT = 190;

function formatHours(n: number) {
  return n.toFixed(1);
}

function DayDetail({
  date,
  entries,
  onBack,
  onDelete,
}: {
  date: string;
  entries: DayEntry[];
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = entries.reduce((sum, e) => sum + e.duration_hours, 0);

  async function confirmDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await onDelete(id);
      setConfirmingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry.");
    } finally {
      setDeletingId(null);
    }
  }
  const label = parseISODate(date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-[var(--subtle)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-3 w-3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {label}
        </button>
        <span className="text-sm font-semibold tabular-nums">
          {formatHours(total)} h
        </span>
      </div>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--subtle)]">No hours logged this day.</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--control-border)] bg-[var(--control-bg)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {e.project}
                  {e.client ? (
                    <span className="font-normal text-[var(--subtle)]">
                      {" "}
                      · {e.client}
                    </span>
                  ) : null}
                </p>
                {e.description ? (
                  <p className="line-clamp-2 text-xs text-[var(--subtle)]">
                    {e.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatHours(e.duration_hours)} h
                  </p>
                  {e.billable ? null : (
                    <p className="text-[11px] text-[var(--subtle)]">non-billable</p>
                  )}
                </div>
                {confirmingId === e.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => confirmDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                    >
                      {deletingId === e.id ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={deletingId === e.id}
                      className="rounded-md px-1.5 py-0.5 text-xs text-[var(--subtle)] transition-colors hover:text-[var(--foreground)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(e.id)}
                    aria-label="Delete entry"
                    title="Delete entry"
                    className="rounded-md p-1 text-[var(--subtle)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HoursChart({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const days = useMemo(() => lastNDays(DAYS), [refreshKey]);
  const today = localISODate();

  useEffect(() => {
    setError(null);
    fetchEntriesBetween(days[0], days[days.length - 1])
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, [days]);

  const byDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const d of days) map.set(d, []);
    for (const e of entries) map.get(e.date)?.push(e);
    return map;
  }, [days, entries]);

  const totals = days.map((d) =>
    (byDay.get(d) ?? []).reduce((sum, e) => sum + e.duration_hours, 0),
  );
  const maxHours = Math.max(8, ...totals);

  if (error) return <p className="p-3 text-sm text-red-600">{error}</p>;

  if (selected) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <DayDetail
          date={selected}
          entries={byDay.get(selected) ?? []}
          onBack={() => setSelected(null)}
          onDelete={async (id) => {
            await deleteTimeEntry(id);
            setEntries((prev) => prev.filter((e) => e.id !== id));
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-3 p-3">
      <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT + 56 }}>
        {days.map((d, i) => {
          const hours = totals[i];
          const isToday = d === today;
          const date = parseISODate(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              aria-label={`${date.toDateString()}: ${formatHours(hours)} hours`}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5 rounded-lg px-1 pb-1 transition-colors hover:bg-[var(--control-bg)]"
            >
              <span className="text-xs font-medium tabular-nums text-[var(--subtle)]">
                {hours > 0 ? formatHours(hours) : ""}
              </span>
              <div
                className="flex w-full items-end"
                style={{ height: CHART_HEIGHT }}
              >
                <div
                  className={`w-full rounded-md transition-opacity group-hover:opacity-80 ${
                    isToday ? "bg-pink-500" : "bg-pink-500/45"
                  }`}
                  style={{
                    height: `${Math.max((hours / maxHours) * 100, hours > 0 ? 3 : 0)}%`,
                  }}
                />
              </div>
              <span
                className={`text-xs ${
                  isToday ? "font-semibold" : "text-[var(--subtle)]"
                }`}
              >
                {date.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="-mt-1 text-[11px] text-[var(--subtle)]">
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
