import type { ActionResult } from "@/lib/types/actions";
import { failure, success } from "@/lib/types/actions";
import type { SupabaseServerClient } from "@/lib/supabase/types";
import { mapPostgrestError } from "@/lib/data/postgrest-error";
import { lineRevenue, toNumber } from "@/lib/data/revenue";
import { addDaysToISODate, monthCalendarRange } from "@/lib/dates";
import type { BillingType } from "@/lib/types/database";

type EntryWithRates = {
  date: string;
  duration_hours: string | number;
  billable: boolean;
  invoiced: boolean;
  tracked_external: boolean;
  projects: {
    id: string;
    name: string;
    billing_type: BillingType;
    flat_amount: string | number | null;
    budget_hours: string | number | null;
    clients: {
      id: string;
      name: string;
      daily_rate: string | number;
    } | null;
  } | null;
};

export type PeriodTotals = {
  hours: number;
  billableHours: number;
  nonBillableHours: number;
  revenue: number;
  entryCount: number;
  workedDays: number;
  /** Billable hours not yet invoiced. */
  uninvoicedHours: number;
  /** Revenue of entries not yet invoiced (flat-rate revenue is excluded). */
  uninvoicedRevenue: number;
  /** Billable share of total hours, 0..1. */
  billableRatio: number;
  avgHoursPerWorkedDay: number;
  /** Revenue per billable hour. */
  effectiveHourlyRate: number;
  externalHours: number;
};

export type ProjectSummary = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  hours: number;
  billableHours: number;
  revenue: number;
  billingType: BillingType;
  flatAmount: number | null;
  budgetHours: number | null;
  /** Billable hours consumed from the budget up to the end of the period (fixed_budget only). */
  budgetUsedHours: number | null;
};

export type PeriodSummary = {
  range: { from: string; to: string };
  totals: PeriodTotals;
  /** Totals for the equivalent previous period, for trend comparison. */
  previous: Pick<PeriodTotals, "hours" | "billableHours" | "revenue"> | null;
  byDay: Array<{
    date: string;
    hours: number;
    billableHours: number;
    revenue: number;
  }>;
  byProject: ProjectSummary[];
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

/** Equivalent previous period: previous full month(s) for month-aligned ranges, else the N days before. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const monthAligned = fd === 1 && to === monthCalendarRange(ty, tm).to;
  if (monthAligned) {
    const months = (ty - fy) * 12 + (tm - fm) + 1;
    const pStart = new Date(fy, fm - 1 - months, 1);
    const pEnd = new Date(fy, fm - 1, 0);
    return {
      from: monthCalendarRange(pStart.getFullYear(), pStart.getMonth() + 1).from,
      to: monthCalendarRange(pEnd.getFullYear(), pEnd.getMonth() + 1).to,
    };
  }
  const days =
    Math.round(
      (new Date(ty, tm - 1, Number(to.split("-")[2])).getTime() -
        new Date(fy, fm - 1, fd).getTime()) /
        86_400_000,
    ) + 1;
  return { from: addDaysToISODate(from, -days), to: addDaysToISODate(from, -1) };
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
      invoiced,
      tracked_external,
      projects (
        id,
        name,
        billing_type,
        flat_amount,
        budget_hours,
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
  return success((data ?? []) as unknown as EntryWithRates[]);
}

/** Billable hours logged on fixed_budget projects strictly before `before`. */
async function fetchPriorBudgetHours(
  supabase: SupabaseServerClient,
  projectIds: string[],
  before: string,
): Promise<ActionResult<Map<string, number>>> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("project_id, duration_hours")
    .in("project_id", projectIds)
    .eq("billable", true)
    .lt("date", before);

  if (error) return failure(mapPostgrestError(error));
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    map.set(r.project_id, (map.get(r.project_id) ?? 0) + toNumber(r.duration_hours));
  }
  return success(map);
}

/** Last billable entry date per `projectId|YYYY-MM` for fixed_monthly projects. */
async function fetchLastBillableDatePerMonth(
  supabase: SupabaseServerClient,
  projectIds: string[],
  from: string,
  to: string,
): Promise<ActionResult<Map<string, string>>> {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const wide = {
    from: monthCalendarRange(fy, fm).from,
    to: monthCalendarRange(ty, tm).to,
  };
  const { data, error } = await supabase
    .from("time_entries")
    .select("project_id, date")
    .in("project_id", projectIds)
    .eq("billable", true)
    .gte("date", wide.from)
    .lte("date", wide.to);

  if (error) return failure(mapPostgrestError(error));
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    const key = `${r.project_id}|${r.date.slice(0, 7)}`;
    const cur = map.get(key);
    if (!cur || r.date > cur) map.set(key, r.date);
  }
  return success(map);
}

type RevenueContext = {
  priorBudgetHours: Map<string, number>;
  /** `projectId|YYYY-MM` -> date on which the monthly flat amount is recognized. */
  monthlyRecognition: Map<string, string>;
};

function buildSummary(
  rows: EntryWithRates[],
  range: { from: string; to: string },
  ctx: RevenueContext,
): PeriodSummary {
  const byDay = new Map<
    string,
    { hours: number; billableHours: number; revenue: number }
  >();
  const byProject = new Map<string, ProjectSummary>();
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
  let uninvoicedHours = 0;
  let uninvoicedRevenue = 0;
  let externalHours = 0;

  const budgetRunning = new Map<string, number>(ctx.priorBudgetHours);

  const projectBlock = (project: EntryWithRates["projects"]): ProjectSummary => {
    const pid = project?.id ?? "unknown";
    const existing = byProject.get(pid);
    if (existing) return existing;
    const client = project?.clients;
    const block: ProjectSummary = {
      projectId: pid,
      projectName: project?.name ?? "Unknown project",
      clientId: client?.id ?? "unknown",
      clientName: client?.name ?? "Unknown client",
      hours: 0,
      billableHours: 0,
      revenue: 0,
      billingType: project?.billing_type ?? "hourly",
      flatAmount: project?.flat_amount != null ? toNumber(project.flat_amount) : null,
      budgetHours: project?.budget_hours != null ? toNumber(project.budget_hours) : null,
      budgetUsedHours: null,
    };
    byProject.set(pid, block);
    return block;
  };

  const addRevenue = (date: string, block: ProjectSummary, rev: number) => {
    if (rev === 0) return;
    revenue += rev;
    block.revenue += rev;
    const day = byDay.get(date) ?? { hours: 0, billableHours: 0, revenue: 0 };
    day.revenue += rev;
    byDay.set(date, day);
    const cblock = byClient.get(block.clientId) ?? {
      clientId: block.clientId,
      clientName: block.clientName,
      hours: 0,
      billableHours: 0,
      revenue: 0,
    };
    cblock.revenue += rev;
    byClient.set(block.clientId, cblock);
  };

  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  for (const row of ordered) {
    const hours = toNumber(row.duration_hours);
    const project = row.projects;
    const dailyRate = toNumber(project?.clients?.daily_rate ?? 0);
    const block = projectBlock(project);
    const billingType = block.billingType;

    let rev = 0;
    if (billingType === "hourly") {
      rev = lineRevenue(dailyRate, hours, row.billable);
    } else if (billingType === "fixed_budget" && row.billable) {
      const budget = block.budgetHours ?? 0;
      const flat = block.flatAmount ?? 0;
      if (budget > 0 && flat > 0) {
        const used = budgetRunning.get(block.projectId) ?? 0;
        const within = Math.max(0, Math.min(hours, budget - used));
        rev = (flat / budget) * within;
        budgetRunning.set(block.projectId, used + hours);
      }
    }

    totalHours += hours;
    if (row.billable) billableHours += hours;
    if (row.tracked_external) externalHours += hours;
    if (row.billable && !row.invoiced) {
      uninvoicedHours += hours;
      uninvoicedRevenue += rev;
    }

    const day = byDay.get(row.date) ?? { hours: 0, billableHours: 0, revenue: 0 };
    day.hours += hours;
    if (row.billable) day.billableHours += hours;
    byDay.set(row.date, day);

    block.hours += hours;
    if (row.billable) block.billableHours += hours;

    const cblock = byClient.get(block.clientId) ?? {
      clientId: block.clientId,
      clientName: block.clientName,
      hours: 0,
      billableHours: 0,
      revenue: 0,
    };
    cblock.hours += hours;
    if (row.billable) cblock.billableHours += hours;
    byClient.set(block.clientId, cblock);

    addRevenue(row.date, block, rev);
  }

  // Monthly flat amounts, recognized on the last billable day of each month.
  for (const [key, date] of ctx.monthlyRecognition) {
    if (date < range.from || date > range.to) continue;
    const pid = key.split("|")[0];
    const block = byProject.get(pid);
    if (!block || block.billingType !== "fixed_monthly") continue;
    addRevenue(date, block, block.flatAmount ?? 0);
  }

  for (const block of byProject.values()) {
    if (block.billingType === "fixed_budget") {
      block.budgetUsedHours = budgetRunning.get(block.projectId) ?? 0;
    }
  }

  const nonBillableHours = Math.max(0, totalHours - billableHours);
  const workedDays = [...byDay.values()].filter((d) => d.hours > 0).length;

  return {
    range,
    totals: {
      hours: totalHours,
      billableHours,
      nonBillableHours,
      revenue,
      entryCount: rows.length,
      workedDays,
      uninvoicedHours,
      uninvoicedRevenue,
      billableRatio: totalHours > 0 ? billableHours / totalHours : 0,
      avgHoursPerWorkedDay: workedDays > 0 ? totalHours / workedDays : 0,
      effectiveHourlyRate: billableHours > 0 ? revenue / billableHours : 0,
      externalHours,
    },
    previous: null,
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

async function computeSummary(
  supabase: SupabaseServerClient,
  from: string,
  to: string,
): Promise<ActionResult<PeriodSummary>> {
  const loaded = await fetchEntriesWithRates(supabase, from, to);
  if (!loaded.ok) return loaded;

  const budgetIds = new Set<string>();
  const monthlyIds = new Set<string>();
  for (const r of loaded.data) {
    const p = r.projects;
    if (!p) continue;
    if (p.billing_type === "fixed_budget") budgetIds.add(p.id);
    if (p.billing_type === "fixed_monthly") monthlyIds.add(p.id);
  }

  const ctx: RevenueContext = {
    priorBudgetHours: new Map(),
    monthlyRecognition: new Map(),
  };
  if (budgetIds.size > 0) {
    const prior = await fetchPriorBudgetHours(supabase, [...budgetIds], from);
    if (!prior.ok) return prior;
    ctx.priorBudgetHours = prior.data;
  }
  if (monthlyIds.size > 0) {
    const rec = await fetchLastBillableDatePerMonth(supabase, [...monthlyIds], from, to);
    if (!rec.ok) return rec;
    ctx.monthlyRecognition = rec.data;
  }

  return success(buildSummary(loaded.data, { from, to }, ctx));
}

export async function getSummaryForRange(
  supabase: SupabaseServerClient,
  from: string,
  to: string,
  options?: { withComparison?: boolean },
): Promise<ActionResult<PeriodSummary>> {
  const current = await computeSummary(supabase, from, to);
  if (!current.ok || !options?.withComparison) return current;

  const prevRange = previousRange(from, to);
  const prev = await computeSummary(supabase, prevRange.from, prevRange.to);
  if (!prev.ok) return success(current.data);
  const { hours, billableHours, revenue } = prev.data.totals;
  return success({ ...current.data, previous: { hours, billableHours, revenue } });
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
