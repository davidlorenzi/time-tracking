import { supabase } from "./supabase";
import { monthRangeContaining, parseISODate } from "./dates";
import {
  computeRevenue,
  toNumber,
  type BillingType,
  type RevenueContext,
  type RevenueEntry,
} from "./revenue";

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

export type ClientOption = {
  id: string;
  name: string;
};

export async function fetchClients(): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type NewClient = {
  name: string;
  daily_rate: number;
  notes?: string;
};

export async function createClient(client: NewClient): Promise<ClientOption> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: client.name,
      daily_rate: client.daily_rate,
      notes: client.notes || null,
    })
    .select("id, name")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export type NewProject = {
  name: string;
  client_id: string;
  description?: string;
  default_billable: boolean;
};

export async function createProject(
  project: NewProject,
): Promise<ActiveProject> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: project.name,
      client_id: project.client_id,
      description: project.description || null,
      default_billable: project.default_billable,
      status: "Active",
    })
    .select("id, name, default_billable")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

export type DayEntry = {
  id: string;
  date: string;
  duration_hours: number;
  description: string;
  billable: boolean;
  project: string;
  client: string;
};

type DayEntryRow = {
  id: string;
  date: string;
  duration_hours: string | number;
  description: string;
  billable: boolean;
  projects: { name: string; clients: { name: string } | null } | null;
};

export async function fetchEntriesBetween(
  from: string,
  to: string,
): Promise<DayEntry[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      "id, date, duration_hours, description, billable, projects ( name, clients ( name ) )",
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DayEntryRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    duration_hours: toNumber(row.duration_hours),
    description: row.description,
    billable: row.billable,
    project: row.projects?.name ?? "—",
    client: row.projects?.clients?.name ?? "",
  }));
}

export type PeriodTotals = {
  hours: number;
  billableHours: number;
  revenue: number;
};

type EntryWithRate = {
  date: string;
  duration_hours: string | number;
  billable: boolean;
  projects: {
    id: string;
    billing_type: BillingType;
    flat_amount: string | number | null;
    budget_hours: string | number | null;
    clients: { daily_rate: string | number } | null;
  } | null;
};

async function fetchPriorBudgetHours(
  projectIds: string[],
  before: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("project_id, duration_hours")
    .in("project_id", projectIds)
    .eq("billable", true)
    .lt("date", before);

  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    map.set(r.project_id, (map.get(r.project_id) ?? 0) + toNumber(r.duration_hours));
  }
  return map;
}

async function fetchLastBillableDatePerMonth(
  projectIds: string[],
  from: string,
  to: string,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("project_id, date")
    .in("project_id", projectIds)
    .eq("billable", true)
    .gte("date", monthRangeContaining(parseISODate(from)).from)
    .lte("date", monthRangeContaining(parseISODate(to)).to);

  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    const key = `${r.project_id}|${r.date.slice(0, 7)}`;
    const current = map.get(key);
    if (!current || r.date > current) map.set(key, r.date);
  }
  return map;
}

export async function fetchSummary(
  from: string,
  to: string,
): Promise<PeriodTotals> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      `
      date,
      duration_hours,
      billable,
      projects (
        id,
        billing_type,
        flat_amount,
        budget_hours,
        clients ( daily_rate )
      )
    `,
    )
    .gte("date", from)
    .lte("date", to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as EntryWithRate[];
  const entries: RevenueEntry[] = rows.map((row) => ({
    date: row.date,
    hours: toNumber(row.duration_hours),
    billable: row.billable,
    projectId: row.projects?.id ?? "unknown",
    billingType: row.projects?.billing_type ?? "hourly",
    dailyRate: toNumber(row.projects?.clients?.daily_rate),
    flatAmount:
      row.projects?.flat_amount != null ? toNumber(row.projects.flat_amount) : null,
    budgetHours:
      row.projects?.budget_hours != null ? toNumber(row.projects.budget_hours) : null,
  }));

  const budgetIds = new Set<string>();
  const monthlyIds = new Set<string>();
  for (const e of entries) {
    if (e.billingType === "fixed_budget") budgetIds.add(e.projectId);
    if (e.billingType === "fixed_monthly") monthlyIds.add(e.projectId);
  }

  const ctx: RevenueContext = {
    priorBudgetHours:
      budgetIds.size > 0
        ? await fetchPriorBudgetHours([...budgetIds], from)
        : new Map(),
    monthlyRecognition:
      monthlyIds.size > 0
        ? await fetchLastBillableDatePerMonth([...monthlyIds], from, to)
        : new Map(),
  };

  return {
    hours: entries.reduce((sum, e) => sum + e.hours, 0),
    billableHours: entries.reduce((sum, e) => sum + (e.billable ? e.hours : 0), 0),
    revenue: computeRevenue(entries, { from, to }, ctx),
  };
}
