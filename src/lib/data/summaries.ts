import type { ActionResult } from "@/lib/types/actions";
import { failure, success } from "@/lib/types/actions";
import type { SupabaseServerClient } from "@/lib/supabase/types";
import { mapPostgrestError } from "@/lib/data/postgrest-error";
import { lineRevenue, toNumber } from "@/lib/data/revenue";
import { monthCalendarRange } from "@/lib/dates";

type EntryWithRates = {
  date: string;
  duration_hours: string | number;
  billable: boolean;
  projects: {
    id: string;
    name: string;
    clients: {
      id: string;
      name: string;
      daily_rate: string | number;
    } | null;
  } | null;
};

export type PeriodSummary = {
  range: { from: string; to: string };
  totals: {
    hours: number;
    billableHours: number;
    nonBillableHours: number;
    revenue: number;
  };
  byDay: Array<{
    date: string;
    hours: number;
    billableHours: number;
    revenue: number;
  }>;
  byProject: Array<{
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    hours: number;
    billableHours: number;
    revenue: number;
  }>;
  byClient: Array<{
    clientId: string;
    clientName: string;
    hours: number;
    billableHours: number;
    revenue: number;
  }>;
};

function monthInclusiveRange(year: number, month: number): { from: string; to: string } {
  return monthCalendarRange(year, month);
}

async function fetchEntriesWithRates(
  supabase: SupabaseServerClient,
  from: string,
  to: string,
): Promise<ActionResult<EntryWithRates[]>> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      `
      date,
      duration_hours,
      billable,
      projects (
        id,
        name,
        clients (
          id,
          name,
          daily_rate
        )
      )
    `,
    )
    .gte("date", from)
    .lte("date", to);

  if (error) return failure(mapPostgrestError(error));
  return success((data ?? []) as EntryWithRates[]);
}

function buildSummary(
  rows: EntryWithRates[],
  range: { from: string; to: string },
): PeriodSummary {
  const byDay = new Map<
    string,
    { hours: number; billableHours: number; revenue: number }
  >();
  const byProject = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      clientId: string;
      clientName: string;
      hours: number;
      billableHours: number;
      revenue: number;
    }
  >();
  const byClient = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      hours: number;
      billableHours: number;
      revenue: number;
    }
  >();

  let totalHours = 0;
  let billableHours = 0;
  let revenue = 0;

  for (const row of rows) {
    const hours = toNumber(row.duration_hours);
    const project = row.projects;
    const client = project?.clients;
    const dailyRate = toNumber(client?.daily_rate ?? 0);
    const rev = lineRevenue(dailyRate, hours, row.billable);

    totalHours += hours;
    if (row.billable) billableHours += hours;
    revenue += rev;

    const d = row.date;
    const day = byDay.get(d) ?? { hours: 0, billableHours: 0, revenue: 0 };
    day.hours += hours;
    if (row.billable) day.billableHours += hours;
    day.revenue += rev;
    byDay.set(d, day);

    const pid = project?.id ?? "unknown";
    const existing = byProject.get(pid);
    const block = existing ?? {
      projectId: pid,
      projectName: project?.name ?? "Unknown project",
      clientId: client?.id ?? "unknown",
      clientName: client?.name ?? "Unknown client",
      hours: 0,
      billableHours: 0,
      revenue: 0,
    };
    block.hours += hours;
    if (row.billable) block.billableHours += hours;
    block.revenue += rev;
    byProject.set(pid, block);

    const cid = block.clientId;
    const cblock =
      byClient.get(cid) ?? {
        clientId: cid,
        clientName: block.clientName,
        hours: 0,
        billableHours: 0,
        revenue: 0,
      };
    cblock.hours += hours;
    if (row.billable) cblock.billableHours += hours;
    cblock.revenue += rev;
    byClient.set(cid, cblock);
  }

  const nonBillableHours = Math.max(0, totalHours - billableHours);

  return {
    range,
    totals: {
      hours: totalHours,
      billableHours,
      nonBillableHours,
      revenue,
    },
    byDay: [...byDay.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    byProject: [...byProject.values()].sort((a, b) =>
      a.clientName === b.clientName
        ? a.projectName.localeCompare(b.projectName)
        : a.clientName.localeCompare(b.clientName),
    ),
    byClient: [...byClient.values()].sort((a, b) =>
      a.clientName.localeCompare(b.clientName),
    ),
  };
}

export async function getSummaryForRange(
  supabase: SupabaseServerClient,
  from: string,
  to: string,
): Promise<ActionResult<PeriodSummary>> {
  const loaded = await fetchEntriesWithRates(supabase, from, to);
  if (!loaded.ok) return loaded;
  return success(buildSummary(loaded.data, { from, to }));
}

export async function getWeeklySummary(
  supabase: SupabaseServerClient,
  weekStart: string,
  weekEnd: string,
): Promise<ActionResult<PeriodSummary>> {
  return getSummaryForRange(supabase, weekStart, weekEnd);
}

export async function getMonthlySummary(
  supabase: SupabaseServerClient,
  year: number,
  month: number,
): Promise<ActionResult<PeriodSummary>> {
  const { from, to } = monthInclusiveRange(year, month);
  return getSummaryForRange(supabase, from, to);
}
