"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DayPanel } from "@/components/calendar/day-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { buildDayResolver, readableText, thresholdState } from "@/lib/calendar-days";
import { cn } from "@/lib/cn";
import { monthGrid } from "@/lib/dates";
import { formatHours, formatMonthTitle } from "@/lib/format";
import type { ResolvedSettings } from "@/lib/settings-defaults";

export type CalendarDay = {
  date: string;
  billableHours: number;
  nonBillableHours: number;
};

export type CalendarProject = {
  id: string;
  name: string;
  default_billable: boolean;
  client_id: string;
  active: boolean;
};

type Props = {
  year: number;
  month: number;
  monthValue: string;
  today: string;
  days: CalendarDay[];
  settings: ResolvedSettings;
  projects: CalendarProject[];
  loadError: string | null;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CalendarView({
  year,
  month,
  monthValue,
  today,
  days,
  settings,
  projects,
  loadError,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const resolve = useMemo(() => buildDayResolver(settings), [settings]);
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const weeks = useMemo(() => monthGrid(year, month), [year, month]);
  const { colors, billableThresholdHours: threshold } = settings;

  const totals = useMemo(() => {
    let billable = 0;
    let nonBillable = 0;
    let reached = 0;
    let workdays = 0;
    for (const week of weeks) {
      for (const iso of week) {
        if (!iso) continue;
        const info = resolve(iso);
        const d = byDate.get(iso);
        billable += d?.billableHours ?? 0;
        nonBillable += d?.nonBillableHours ?? 0;
        if (info.kind === "workday" && iso <= today) {
          workdays += 1;
          const st = thresholdState(d?.billableHours ?? 0, threshold);
          if (st === "reached" || st === "over") reached += 1;
        }
      }
    }
    return { billable, nonBillable, reached, workdays };
  }, [weeks, byDate, resolve, threshold, today]);

  const thresholdColor = {
    below: colors.below_threshold,
    reached: colors.reached_threshold,
    over: colors.over_threshold,
  } as const;

  return (
    <div className="space-y-4">
      <PageHeader
        title={formatMonthTitle(year, month)}
        className="mb-2 sm:mb-4"
        description={`Billable target: ${formatHours(threshold)} per working day.`}
        actions={
          <>
            <Link href={`/calendar?m=${shiftMonth(year, month, -1)}`} aria-label="Previous month">
              <Button variant="secondary" size="md" className="w-11 px-0">‹</Button>
            </Link>
            <Link href={`/calendar?m=${today.slice(0, 7)}`}>
              <Button variant="secondary">Today</Button>
            </Link>
            <Link href={`/calendar?m=${shiftMonth(year, month, 1)}`} aria-label="Next month">
              <Button variant="secondary" size="md" className="w-11 px-0">›</Button>
            </Link>
          </>
        }
      />
      {loadError ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{loadError}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Billable" value={formatHours(totals.billable)} />
        <StatCard label="Non-billable" value={formatHours(totals.nonBillable)} />
        <StatCard
          label="Days on target"
          value={`${totals.reached}/${totals.workdays}`}
          hint="working days so far"
        />
        <StatCard
          label="Avg billable / day"
          value={formatHours(totals.workdays ? totals.billable / totals.workdays : 0)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800" role="grid" aria-label={formatMonthTitle(year, month)}>
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="py-2">{w}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" role="row">
            {week.map((iso, di) => {
              if (!iso) {
                return <div key={di} className="min-h-16 border-b border-r border-zinc-100 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-900/30 sm:min-h-24" />;
              }
              const info = resolve(iso);
              const d = byDate.get(iso);
              const billable = d?.billableHours ?? 0;
              const nonBillable = d?.nonBillableHours ?? 0;
              let st = thresholdState(billable, threshold);
              if (st === "none" && info.kind === "workday" && iso <= today) st = "below";
              const bg =
                info.kind === "holiday"
                  ? colors.holiday
                  : info.kind === "weekend"
                    ? colors.weekend
                    : colors.workday;
              const defaultWork = info.kind === "workday" && colors.workday.toLowerCase() === "#ffffff";
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  onClick={() => setSelected(iso)}
                  aria-label={`${iso}: ${formatHours(billable)} billable, ${formatHours(nonBillable)} non-billable${info.holidayName ? `, ${info.holidayName}` : ""}`}
                  title={info.holidayName ?? undefined}
                  className={cn(
                    "relative flex min-h-16 flex-col items-start gap-0.5 border-b border-r border-zinc-200/70 p-1 text-left transition-[filter] hover:brightness-95 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-800 sm:min-h-24 sm:p-2",
                    defaultWork && "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100",
                  )}
                  style={defaultWork ? undefined : { backgroundColor: bg, color: readableText(bg) }}
                >
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold sm:text-xs",
                      isToday && "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
                    )}
                  >
                    {Number(iso.slice(8))}
                  </span>
                  {billable > 0 ? (
                    <span className="text-xs font-semibold tabular-nums sm:text-sm">{formatHours(billable)}</span>
                  ) : null}
                  {nonBillable > 0 ? (
                    <span className="text-[10px] tabular-nums opacity-70 sm:text-xs">+{formatHours(nonBillable)}</span>
                  ) : null}
                  {info.holidayName ? (
                    <span className="mt-auto hidden w-full truncate text-[10px] opacity-70 sm:block">{info.holidayName}</span>
                  ) : null}
                  {st !== "none" ? (
                    <span
                      className="absolute inset-x-0 bottom-0 h-1.5"
                      style={{ backgroundColor: thresholdColor[st] }}
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400" aria-label="Legend">
        {(
          [
            ["Working day", colors.workday],
            ["Weekend", colors.weekend],
            ["Holiday", colors.holiday],
            [`Below ${formatHours(threshold)}`, colors.below_threshold],
            ["On target", colors.reached_threshold],
            ["Above target", colors.over_threshold],
          ] as const
        ).map(([label, color]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-zinc-300 dark:border-zinc-600" style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
        <li>
          <Link href="/settings" className="underline underline-offset-2">Customize</Link>
        </li>
      </ul>

      <DayPanel
        key={selected ?? "closed"}
        date={selected}
        projects={projects}
        onClose={() => setSelected(null)}
        monthValue={monthValue}
      />
    </div>
  );
}
