"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { getRangeSummaryAction } from "@/actions/summaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { APP_DATA_REFRESH_EVENT } from "@/lib/app-events";
import { buildDayResolver, thresholdState } from "@/lib/calendar-days";
import { cn } from "@/lib/cn";
import {
  addDaysToISODate,
  localISODate,
  monthCalendarRange,
  weekRangeContaining,
} from "@/lib/dates";
import type { PeriodSummary } from "@/lib/data/summaries";
import { formatHours, formatMoney } from "@/lib/format";
import type { ResolvedSettings } from "@/lib/settings-defaults";

import { BreakdownChart, type BreakdownItem } from "./breakdown-chart";
import { DailyHoursChart } from "./daily-hours-chart";

type Preset = "week" | "month" | "quarter" | "year" | "custom";
type GroupBy = "client" | "project";
type Metric = "hours" | "revenue";

type DashboardViewProps = {
  initialSummary: PeriodSummary | null;
  initialFrom: string;
  initialTo: string;
  settings: ResolvedSettings;
};

const PRESETS: { value: Preset; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

function rangeFor(preset: Exclude<Preset, "custom">, anchor: string): { from: string; to: string } {
  const [y, m, d] = anchor.split("-").map(Number);
  if (preset === "week") return weekRangeContaining(new Date(y, m - 1, d));
  if (preset === "month") return monthCalendarRange(y, m);
  if (preset === "quarter") {
    const startMonth = Math.floor((m - 1) / 3) * 3 + 1;
    return {
      from: monthCalendarRange(y, startMonth).from,
      to: monthCalendarRange(y, startMonth + 2).to,
    };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function shiftAnchor(preset: Exclude<Preset, "custom">, anchor: string, dir: number): string {
  const [y, m, d] = anchor.split("-").map(Number);
  if (preset === "week") return addDaysToISODate(anchor, 7 * dir);
  if (preset === "month") return localISODate(new Date(y, m - 1 + dir, 1));
  if (preset === "quarter") return localISODate(new Date(y, m - 1 + 3 * dir, 1));
  return localISODate(new Date(y + dir, 0, Math.min(d, 28)));
}

function rangeLabel(from: string, to: string): string {
  const fmt = (iso: string, withYear: boolean) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });
  };
  return `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to, true)}`;
}

function delta(current: number, previous: number | undefined | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function DashboardView({
  initialSummary,
  initialFrom,
  initialTo,
  settings,
}: DashboardViewProps) {
  const router = useRouter();
  const today = useMemo(() => localISODate(), []);
  const [preset, setPreset] = useState<Preset>("month");
  const [anchor, setAnchor] = useState(initialFrom);
  const [customFrom, setCustomFrom] = useState(initialFrom);
  const [customTo, setCustomTo] = useState(initialTo);
  const [groupBy, setGroupBy] = useState<GroupBy>("client");
  const [metric, setMetric] = useState<Metric>("hours");
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const range = useMemo(() => {
    if (preset === "custom") {
      return customFrom && customTo && customFrom <= customTo
        ? { from: customFrom, to: customTo }
        : null;
    }
    return rangeFor(preset, anchor);
  }, [preset, anchor, customFrom, customTo]);

  const rangeKey = range ? `${range.from}|${range.to}` : null;
  const lastFetchedKey = useRef<string | null>(
    initialSummary ? `${initialFrom}|${initialTo}` : null,
  );
  const rangeRef = useRef(range);
  rangeRef.current = range;

  function load(r: { from: string; to: string }) {
    setError(null);
    startTransition(async () => {
      const res = await getRangeSummaryAction(r);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSummary(res.data);
    });
  }

  useEffect(() => {
    if (!range || rangeKey === lastFetchedKey.current) return;
    lastFetchedKey.current = rangeKey;
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  useEffect(() => {
    const onRefresh = () => {
      const r = rangeRef.current;
      if (r) load(r);
    };
    window.addEventListener(APP_DATA_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(APP_DATA_REFRESH_EVENT, onRefresh);
  }, []);

  const resolveDay = useMemo(() => buildDayResolver(settings), [settings]);

  const daysOnTarget = useMemo(() => {
    if (!summary) return { reached: 0, workdays: 0 };
    const byDate = new Map(summary.byDay.map((d) => [d.date, d.billableHours]));
    let reached = 0;
    let workdays = 0;
    let cursor = summary.range.from;
    const end = summary.range.to < today ? summary.range.to : today;
    for (let i = 0; cursor <= end && i < 800; i++) {
      if (resolveDay(cursor).kind === "workday") {
        workdays += 1;
        const st = thresholdState(byDate.get(cursor) ?? 0, settings.billableThresholdHours);
        if (st === "reached" || st === "over") reached += 1;
      }
      cursor = addDaysToISODate(cursor, 1);
    }
    return { reached, workdays };
  }, [summary, resolveDay, settings.billableThresholdHours, today]);

  const breakdownItems: BreakdownItem[] = useMemo(() => {
    if (!summary) return [];
    const items =
      groupBy === "client"
        ? summary.byClient.map((c) => ({
            key: c.clientId,
            label: c.clientName,
            hours: c.hours,
            revenue: c.revenue,
          }))
        : summary.byProject.map((p) => ({
            key: p.projectId,
            label: p.projectName,
            hours: p.hours,
            revenue: p.revenue,
          }));
    return items.sort((a, b) => b[metric] - a[metric]);
  }, [summary, groupBy, metric]);

  const sortedDays = useMemo(
    () => (summary ? [...summary.byDay].sort((a, b) => a.date.localeCompare(b.date)) : []),
    [summary],
  );

  const budgetProjects = useMemo(
    () =>
      summary?.byProject.filter(
        (p) => p.billingType === "fixed_budget" && p.budgetHours && p.budgetUsedHours != null,
      ) ?? [],
    [summary],
  );

  const entriesHref = (extra: Record<string, string>) => {
    if (!summary) return "/time-entries";
    const q = new URLSearchParams({ from: summary.range.from, to: summary.range.to, ...extra });
    return `/time-entries?${q.toString()}`;
  };

  const shift = (dir: number) => {
    if (preset === "custom") return;
    setAnchor((a) => shiftAnchor(preset, a, dir));
  };

  const t = summary?.totals;
  const prev = summary?.previous;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Period"
        >
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={preset === p.value}
              onClick={() => {
                if (p.value === "custom" && summary) {
                  setCustomFrom(summary.range.from);
                  setCustomTo(summary.range.to);
                }
                setPreset(p.value);
              }}
              className={cn(
                "h-10 shrink-0 rounded-lg px-4 text-sm font-medium transition-colors",
                preset === p.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="From" className="w-40" />
            <span className="text-zinc-400">→</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="To" className="w-40" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="w-11 px-0" onClick={() => shift(-1)} disabled={pending} aria-label="Previous period">‹</Button>
            <span className="min-w-[10rem] text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {range ? rangeLabel(range.from, range.to) : ""}
            </span>
            <Button variant="secondary" className="w-11 px-0" onClick={() => shift(1)} disabled={pending} aria-label="Next period">›</Button>
            <Button variant="ghost" onClick={() => setAnchor(today)} disabled={pending}>Today</Button>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
      ) : null}

      <div className="relative min-h-[8rem]">
        {pending ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/65 backdrop-blur-sm" aria-busy="true" aria-live="polite">
            <Spinner className="text-zinc-700 dark:text-zinc-200" label="Updating dashboard" />
          </div>
        ) : null}

        {!summary || !t ? (
          <div className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No summary data.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Add time entries and ensure Supabase is configured.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Total hours"
                value={formatHours(t.hours)}
                delta={delta(t.hours, prev?.hours)}
                hint={`${t.entryCount} entries · ${t.workedDays} days`}
              />
              <StatCard
                label="Billable"
                value={<span className="text-emerald-700 dark:text-emerald-400">{formatHours(t.billableHours)}</span>}
                delta={delta(t.billableHours, prev?.billableHours)}
                hint={`${formatHours(t.nonBillableHours)} non-billable`}
              />
              <StatCard
                label="Est. revenue"
                value={formatMoney(t.revenue)}
                delta={delta(t.revenue, prev?.revenue)}
                hint="vs previous period"
              />
              <StatCard
                label="To invoice"
                value={formatHours(t.uninvoicedHours)}
                hint={t.uninvoicedRevenue > 0 ? `≈ ${formatMoney(t.uninvoicedRevenue)}` : "billable, not invoiced"}
              />
              <StatCard label="Billable ratio" value={`${Math.round(t.billableRatio * 100)}%`} hint="of total hours" />
              <StatCard label="Avg per worked day" value={formatHours(t.avgHoursPerWorkedDay)} />
              <StatCard
                label="Effective rate"
                value={t.effectiveHourlyRate > 0 ? `${formatMoney(t.effectiveHourlyRate)}/h` : "—"}
                hint="revenue ÷ billable h"
              />
              <StatCard
                label="Days on target"
                value={`${daysOnTarget.reached}/${daysOnTarget.workdays}`}
                hint={`≥ ${formatHours(settings.billableThresholdHours)} billable`}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>By day</CardTitle>
                    <p className="mt-0.5 text-xs text-zinc-500">Tap a bar to see that day’s entries</p>
                  </div>
                  <Link href="/calendar" className="text-xs font-medium underline underline-offset-2">Open calendar</Link>
                </CardHeader>
                <CardContent>
                  <DailyHoursChart
                    days={sortedDays}
                    onSelectDay={(date) => router.push(`/time-entries?from=${date}&to=${date}`)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>Breakdown</CardTitle>
                    <p className="mt-0.5 text-xs text-zinc-500">Tap a bar to filter the entries</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Segmented
                      value={groupBy}
                      onChange={setGroupBy}
                      options={[["client", "Client"], ["project", "Project"]]}
                    />
                    <Segmented
                      value={metric}
                      onChange={setMetric}
                      options={[["hours", "Hours"], ["revenue", "Revenue"]]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <BreakdownChart
                    items={breakdownItems}
                    metric={metric}
                    onSelect={(key) =>
                      router.push(entriesHref({ [groupBy === "client" ? "client" : "project"]: key }))
                    }
                  />
                </CardContent>
              </Card>
            </div>

            {budgetProjects.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Flat-rate budget progress</CardTitle>
                  <p className="text-xs text-zinc-500">Billable hours used vs budget, up to the end of the period</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {budgetProjects.map((p) => {
                    const used = p.budgetUsedHours ?? 0;
                    const budget = p.budgetHours ?? 1;
                    const pct = (used / budget) * 100;
                    return (
                      <div key={p.projectId}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate font-medium">{p.projectName}</span>
                          <span className={cn("shrink-0 tabular-nums", pct > 100 && "font-semibold text-red-600 dark:text-red-400")}>
                            {formatHours(used)} / {formatHours(budget)} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={cn("h-full rounded-full", pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-8 rounded-md px-3 text-xs font-medium transition-colors",
            value === v ? "bg-zinc-200 dark:bg-zinc-700" : "text-zinc-500",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
