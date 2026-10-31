import type { ActionResult } from "@/lib/types/actions";
import { failure, success } from "@/lib/types/actions";
import type { SupabaseServerClient } from "@/lib/supabase/types";
import type { TimeEntryRow } from "@/lib/types/database";
import { mapPostgrestError } from "@/lib/data/postgrest-error";
import type {
  TimeEntryCreateInput,
  TimeEntryExportFilters,
  TimeEntryUpdateInput,
} from "@/lib/validation/time-entries";

export async function createTimeEntry(
  supabase: SupabaseServerClient,
  input: TimeEntryCreateInput,
): Promise<ActionResult<TimeEntryRow>> {
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      date: input.date,
      duration_hours: input.duration_hours,
      description: input.description,
      project_id: input.project_id,
      tracked_external: input.tracked_external,
      billable: input.billable,
      invoiced: input.invoiced,
    })
    .select()
    .single();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}

export async function updateTimeEntry(
  supabase: SupabaseServerClient,
  input: TimeEntryUpdateInput,
): Promise<ActionResult<TimeEntryRow>> {
  const { id, ...patch } = input;
  const row: Record<string, unknown> = {};

  if (patch.date !== undefined) row.date = patch.date;
  if (patch.duration_hours !== undefined)
    row.duration_hours = patch.duration_hours;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.project_id !== undefined) row.project_id = patch.project_id;
  if (patch.tracked_external !== undefined)
    row.tracked_external = patch.tracked_external;
  if (patch.billable !== undefined) row.billable = patch.billable;
  if (patch.invoiced !== undefined) row.invoiced = patch.invoiced;

  if (Object.keys(row).length === 0) {
    return failure("No fields to update.");
  }

  const { data, error } = await supabase
    .from("time_entries")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}

export async function deleteTimeEntry(
  supabase: SupabaseServerClient,
  id: string,
): Promise<ActionResult<void>> {
  const { error } = await supabase.from("time_entries").delete().eq("id", id);

  if (error) return failure(mapPostgrestError(error));
  return success(undefined);
}

export async function listTimeEntriesInRange(
  supabase: SupabaseServerClient,
  from: string,
  to: string,
): Promise<ActionResult<TimeEntryRow[]>> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (error) return failure(mapPostgrestError(error));
  return success(data ?? []);
}

export type TimeEntryListRow = TimeEntryRow & {
  projects: { id: string; name: string } | null;
};

export async function listTimeEntriesWithProjects(
  supabase: SupabaseServerClient,
  options?: { limit?: number; from?: string; to?: string },
): Promise<ActionResult<TimeEntryListRow[]>> {
  const limit = options?.limit ?? (options?.from || options?.to ? 2000 : 300);
  let query = supabase.from("time_entries").select("*, projects ( id, name )");
  if (options?.from) query = query.gte("date", options.from);
  if (options?.to) query = query.lte("date", options.to);
  const { data, error } = await query
    .order("date", { ascending: false })
    .order("name", { ascending: true, referencedTable: "projects" })
    .order("description", { ascending: true })
    .limit(limit);

  if (error) return failure(mapPostgrestError(error));
  return success((data ?? []) as TimeEntryListRow[]);
}

export async function listTimeEntriesForDate(
  supabase: SupabaseServerClient,
  date: string,
): Promise<ActionResult<TimeEntryListRow[]>> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("*, projects ( id, name )")
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) return failure(mapPostgrestError(error));
  return success((data ?? []) as TimeEntryListRow[]);
}

export async function listRecentEntriesForProject(
  supabase: SupabaseServerClient,
  projectId: string,
  limit = 15,
): Promise<ActionResult<TimeEntryListRow[]>> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("*, projects ( id, name )")
    .eq("project_id", projectId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return failure(mapPostgrestError(error));
  return success((data ?? []) as TimeEntryListRow[]);
}

export type TimeEntryExportRow = {
  date: string;
  duration_hours: number;
  description: string;
  billable: boolean;
  invoiced: boolean;
  tracked_external: boolean;
  projects: {
    id: string;
    name: string;
    clients: { id: string; name: string } | null;
  } | null;
};

/** Project ids matching the client/project filters, or `null` when unfiltered. */
async function resolveProjectIds(
  supabase: SupabaseServerClient,
  filters: TimeEntryExportFilters,
): Promise<ActionResult<string[] | null>> {
  if (filters.clientIds.length === 0 && filters.projectIds.length === 0) {
    return success(null);
  }
  let ids = filters.projectIds.length > 0 ? new Set(filters.projectIds) : null;

  if (filters.clientIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .in("client_id", filters.clientIds);
    if (error) return failure(mapPostgrestError(error));
    const byClient = new Set((data ?? []).map((p) => p.id));
    ids = ids ? new Set([...ids].filter((id) => byClient.has(id))) : byClient;
  }
  return success([...(ids ?? [])]);
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// The Postgrest builder's generic type is too unwieldy to name here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyExportFilters<Q extends { [k: string]: any }>(
  query: Q,
  filters: TimeEntryExportFilters,
  projectIds: string[] | null,
): Q {
  let q = query;
  if (filters.from) q = q.gte("date", filters.from);
  if (filters.to) q = q.lte("date", filters.to);
  if (projectIds) q = q.in("project_id", projectIds);
  if (filters.billable !== "all") q = q.eq("billable", filters.billable === "yes");
  if (filters.invoiced !== "all") q = q.eq("invoiced", filters.invoiced === "yes");
  if (filters.trackedExternal !== "all") {
    q = q.eq("tracked_external", filters.trackedExternal === "yes");
  }
  if (filters.search) q = q.ilike("description", `%${escapeLike(filters.search)}%`);
  return q;
}

export async function listTimeEntriesForExport(
  supabase: SupabaseServerClient,
  filters: TimeEntryExportFilters,
  limit = 10_000,
): Promise<ActionResult<TimeEntryExportRow[]>> {
  const ids = await resolveProjectIds(supabase, filters);
  if (!ids.ok) return ids;
  if (ids.data && ids.data.length === 0) return success([]);

  const base = supabase
    .from("time_entries")
    .select(
      `
      date,
      duration_hours,
      description,
      billable,
      invoiced,
      tracked_external,
      projects (
        id,
        name,
        clients ( id, name )
      )
    `,
    );
  const { data, error } = await applyExportFilters(base, filters, ids.data)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) return failure(mapPostgrestError(error));
  return success((data ?? []) as TimeEntryExportRow[]);
}

export async function countTimeEntriesForExport(
  supabase: SupabaseServerClient,
  filters: TimeEntryExportFilters,
): Promise<ActionResult<{ count: number; hours: number }>> {
  const ids = await resolveProjectIds(supabase, filters);
  if (!ids.ok) return ids;
  if (ids.data && ids.data.length === 0) return success({ count: 0, hours: 0 });

  const base = supabase.from("time_entries").select("duration_hours");
  const { data, error } = await applyExportFilters(base, filters, ids.data).limit(50_000);

  if (error) return failure(mapPostgrestError(error));
  const rows = (data ?? []) as { duration_hours: number | string }[];
  const hours = rows.reduce((sum, r) => sum + Number(r.duration_hours), 0);
  return success({ count: rows.length, hours });
}
