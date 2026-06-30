import { supabase } from "./supabase";
import { lineRevenue, toNumber } from "./revenue";

export type ActiveProject = {
  id: string;
  name: string;
  default_billable: boolean;
};

export async function fetchActiveProjects(): Promise<ActiveProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, default_billable")
    .eq("status", "Active")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type NewTimeEntry = {
  date: string;
  duration_hours: number;
  description: string;
  project_id: string;
  billable: boolean;
};

export async function createTimeEntry(entry: NewTimeEntry): Promise<void> {
  const { error } = await supabase.from("time_entries").insert({
    date: entry.date,
    duration_hours: entry.duration_hours,
    description: entry.description,
    project_id: entry.project_id,
    billable: entry.billable,
    tracked_external: false,
    invoiced: false,
  });

  if (error) throw new Error(error.message);
}

export type PeriodTotals = {
  hours: number;
  billableHours: number;
  revenue: number;
};

type EntryWithRate = {
  duration_hours: string | number;
  billable: boolean;
  projects: { clients: { daily_rate: string | number } | null } | null;
};

export async function fetchSummary(
  from: string,
  to: string,
): Promise<PeriodTotals> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      `
      duration_hours,
      billable,
      projects ( clients ( daily_rate ) )
    `,
    )
    .gte("date", from)
    .lte("date", to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as EntryWithRate[];
  return rows.reduce<PeriodTotals>(
    (acc, row) => {
      const hours = toNumber(row.duration_hours);
      const dailyRate = toNumber(row.projects?.clients?.daily_rate);
      acc.hours += hours;
      if (row.billable) acc.billableHours += hours;
      acc.revenue += lineRevenue(dailyRate, hours, row.billable);
      return acc;
    },
    { hours: 0, billableHours: 0, revenue: 0 },
  );
}
