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
