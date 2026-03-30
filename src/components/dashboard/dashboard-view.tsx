"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { getMonthlySummaryAction, getWeeklySummaryAction } from "@/actions/summaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { APP_DATA_REFRESH_EVENT } from "@/lib/app-events";
import { addDaysToISODate } from "@/lib/dates";
import type { PeriodSummary } from "@/lib/data/summaries";
import { cn } from "@/lib/cn";

import { SimpleBars, type BarItem } from "./simple-bars";

type DashboardViewProps = {
  initialWeekSummary: PeriodSummary | null;
  initialMonthSummary: PeriodSummary | null;
  initialWeekFrom: string;
  initialWeekTo: string;
  initialMonthValue: string;
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeekLabel(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd);
  const b = new Date(ty, tm - 1, td);
  const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${a.toLocaleDateString(undefined, o)} – ${b.toLocaleDateString(undefined, { ...o, year: "numeric" })}`;
}

type Period = "week" | "month";
type GroupBy = "client" | "project";

export function DashboardView({
  initialWeekSummary,
  initialMonthSummary,
  initialWeekFrom,
  initialWeekTo,
  initialMonthValue,
}: DashboardViewProps) {
  const [period, setPeriod] = useState<Period>("month");
  const [groupBy, setGroupBy] = useState<GroupBy>("client");
  const [weekFrom, setWeekFrom] = useState(initialWeekFrom);
  const [weekTo, setWeekTo] = useState(initialWeekTo);
  const [monthValue, setMonthValue] = useState(initialMonthValue);
  const [weekSummary, setWeekSummary] = useState(initialWeekSummary);
  const [monthSummary, setMonthSummary] = useState(initialMonthSummary);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const summary = period === "week" ? weekSummary : monthSummary;

  const reloadWeek = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = await getWeeklySummaryAction({ from: weekFrom, to: weekTo });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setWeekSummary(res.data);
    });
  }, [weekFrom, weekTo]);

  const reloadMonth = useCallback(() => {
    setError(null);
    const [y, m] = monthValue.split("-").map(Number);
    startTransition(async () => {
      const res = await getMonthlySummaryAction({ year: y, month: m });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMonthSummary(res.data);
    });
  }, [monthValue]);

  useEffect(() => {
    const onDataRefresh = () => {
      setError(null);
      startTransition(async () => {
        const [y, m] = monthValue.split("-").map(Number);
        const [wRes, mRes] = await Promise.all([
          getWeeklySummaryAction({ from: weekFrom, to: weekTo }),
          getMonthlySummaryAction({ year: y, month: m }),
        ]);
        if (!wRes.ok) {
          setError(wRes.error);
          return;
        }
        if (!mRes.ok) {
          setError(mRes.error);
          return;
        }
        setWeekSummary(wRes.data);
        setMonthSummary(mRes.data);
      });
    };
    window.addEventListener(APP_DATA_REFRESH_EVENT, onDataRefresh);
    return () => window.removeEventListener(APP_DATA_REFRESH_EVENT, onDataRefresh);
  }, [weekFrom, weekTo, monthValue]);

  const shiftWeek = (deltaWeeks: number) => {
    const nf = addDaysToISODate(weekFrom, deltaWeeks * 7);
    const nt = addDaysToISODate(weekTo, deltaWeeks * 7);
    setWeekFrom(nf);
    setWeekTo(nt);
    setError(null);
    startTransition(async () => {
      const res = await getWeeklySummaryAction({ from: nf, to: nt });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setWeekSummary(res.data);
    });
  };

  const barItems: BarItem[] = useMemo(() => {
    if (!summary) return [];
    if (groupBy === "client") {
      return summary.byClient.map((c) => ({
        key: c.clientId,
        label: c.clientName,
        value: c.hours,
        revenue: c.revenue,
      }));
    }
    return summary.byProject.map((p) => ({
      key: p.projectId,
      label: p.projectName,
      value: p.hours,
      revenue: p.revenue,
    }));
  }, [summary, groupBy]);

  const dayBars: BarItem[] = useMemo(() => {
    if (!summary) return [];
    const days = [...summary.byDay].sort((a, b) => a.date.localeCompare(b.date));
    return days.map((d) => ({
      key: d.date,
      label: d.date,
      value: d.hours,
    }));
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === "week"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === "month"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            Month
          </button>
        </div>

        {period === "week" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => shiftWeek(-1)}
              disabled={pending}
            >
              ← Prev
            </Button>
            <span className="min-w-[10rem] text-center text-sm text-zinc-600 dark:text-zinc-400">
              {formatWeekLabel(weekFrom, weekTo)}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => shiftWeek(1)}
              disabled={pending}
            >
              Next →
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reloadWeek}
              disabled={pending}
            >
              Refresh
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="dash-month" className="text-xs">
                Month
              </Label>
              <Input
                id="dash-month"
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="h-9 w-44"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={reloadMonth}
              disabled={pending}
            >
              Load
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="relative min-h-[8rem]">
        {pending ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/65 backdrop-blur-sm dark:bg-background/55"
            aria-busy="true"
            aria-live="polite"
          >
            <Spinner
              className="text-zinc-700 dark:text-zinc-200"
              label="Updating dashboard"
            />
          </div>
        ) : null}

        {!summary ? (
          <p className="text-sm text-zinc-500">
            No summary data. Add time entries and ensure Supabase is configured.
          </p>
        ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <Card>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Total hours
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-2xl font-semibold tabular-nums">
                  {summary.totals.hours.toFixed(1)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Billable
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {summary.totals.billableHours.toFixed(1)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Non-billable
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-2xl font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
                  {summary.totals.nonBillableHours.toFixed(1)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="border-0 pb-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Est. revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-2xl font-semibold tabular-nums">
                  {formatMoney(summary.totals.revenue)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">daily rate ÷ 8 × h</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-2 grid gap-6 lg:grid-cols-2 lg:gap-8">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle>By day</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBars items={dayBars} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Breakdown</CardTitle>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Hours and est. revenue (daily rate ÷ 8 × billable h)
                  </p>
                </div>
                <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setGroupBy("client")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium",
                      groupBy === "client"
                        ? "bg-zinc-200 dark:bg-zinc-700"
                        : "text-zinc-500",
                    )}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupBy("project")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium",
                      groupBy === "project"
                        ? "bg-zinc-200 dark:bg-zinc-700"
                        : "text-zinc-500",
                    )}
                  >
                    Project
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <SimpleBars items={barItems} />
              </CardContent>
            </Card>
          </div>
        </>
        )}
      </div>
    </div>
  );
}
