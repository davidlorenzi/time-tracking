import type { ActionResult } from "@/lib/types/actions";
import { failure, success } from "@/lib/types/actions";
import type { SupabaseServerClient } from "@/lib/supabase/types";
import type { TimeEntryRow } from "@/lib/types/database";
import { mapPostgrestError } from "@/lib/data/postgrest-error";
import type {
  TimeEntryCreateInput,
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
  options?: { limit?: number },
): Promise<ActionResult<TimeEntryListRow[]>> {
  const limit = options?.limit ?? 300;
  const { data, error } = await supabase
    .from("time_entries")
    .select("*, projects ( id, name )")
    .order("date", { ascending: false })
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

export async function listTimeEntriesForExport(
  supabase: SupabaseServerClient,
  limit = 10_000,
): Promise<ActionResult<TimeEntryExportRow[]>> {
  const { data, error } = await supabase
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
    )
    .order("date", { ascending: false })
    .limit(limit);

  if (error) return failure(mapPostgrestError(error));
  return success((data ?? []) as TimeEntryExportRow[]);
}
