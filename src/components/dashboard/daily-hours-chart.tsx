"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PeriodSummary } from "@/lib/data/summaries";

type DailyHoursChartProps = {
  days: PeriodSummary["byDay"];
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; billableHours: number; nonBillableHours: number; revenue: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium text-zinc-900 dark:text-zinc-50">
        {formatDayLabel(d.date)}
      </p>
      <p className="mt-1 text-emerald-700 dark:text-emerald-400">
        Billable: {d.billableHours.toFixed(1)}h
      </p>
      <p className="text-zinc-500 dark:text-zinc-400">
        Non-billable: {d.nonBillableHours.toFixed(1)}h
      </p>
      <p className="mt-1 text-zinc-700 dark:text-zinc-300">
        Revenue: {formatMoney(d.revenue)}
      </p>
    </div>
  );
}

export function DailyHoursChart({ days }: DailyHoursChartProps) {
  if (days.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No data.</p>;
  }

  const data = days.map((d) => ({
    ...d,
    nonBillableHours: Math.max(0, d.hours - d.billableHours),
  }));

  return (
    <div className="h-64 text-zinc-500 dark:text-zinc-400">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" opacity={0.15} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={{ stroke: "currentColor", opacity: 0.2 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", opacity: 0.06 }} />
          <Bar
            dataKey="billableHours"
            stackId="hours"
            fill="#10b981"
            radius={[0, 0, 0, 0]}
            isAnimationActive
            animationDuration={400}
          />
          <Bar
            dataKey="nonBillableHours"
            stackId="hours"
            fill="#a1a1aa"
            radius={[4, 4, 0, 0]}
            isAnimationActive
            animationDuration={400}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
