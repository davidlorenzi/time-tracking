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

export type BreakdownItem = {
  key: string;
  label: string;
  hours: number;
  revenue: number;
};

type BreakdownChartProps = {
  items: BreakdownItem[];
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: BreakdownItem }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="max-w-[12rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{d.label}</p>
      <p className="mt-1 text-zinc-700 dark:text-zinc-300">{d.hours.toFixed(1)}h</p>
      <p className="text-emerald-700 dark:text-emerald-400">{formatMoney(d.revenue)}</p>
    </div>
  );
}

export function BreakdownChart({ items }: BreakdownChartProps) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No data.</p>;
  }

  const height = Math.max(64, items.length * 36);

  return (
    <div className="text-zinc-500 dark:text-zinc-400" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={items}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="currentColor" opacity={0.15} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", opacity: 0.06 }} />
          <Bar
            dataKey="hours"
            fill="#3f3f46"
            radius={[0, 4, 4, 0]}
            isAnimationActive
            animationDuration={400}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
