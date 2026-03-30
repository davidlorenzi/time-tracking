import type { ActionResult } from "@/lib/types/actions";
import { failure, success } from "@/lib/types/actions";
import type { SupabaseServerClient } from "@/lib/supabase/types";
import type { ProjectRow } from "@/lib/types/database";
import { mapPostgrestError } from "@/lib/data/postgrest-error";
import { optionalTextToNull } from "@/lib/data/normalize";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "@/lib/validation/projects";

export async function createProject(
  supabase: SupabaseServerClient,
  input: ProjectCreateInput,
): Promise<ActionResult<ProjectRow>> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      status: input.status,
      client_id: input.client_id,
      description: optionalTextToNull(input.description),
    })
    .select()
    .single();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}

export async function updateProject(
  supabase: SupabaseServerClient,
  input: ProjectUpdateInput,
): Promise<ActionResult<ProjectRow>> {
  const { id, ...patch } = input;
  const row: Record<string, unknown> = {};

  if (patch.name !== undefined) row.name = patch.name;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.client_id !== undefined) row.client_id = patch.client_id;
  if (patch.description !== undefined) {
    row.description = optionalTextToNull(patch.description);
  }

  if (Object.keys(row).length === 0) {
    return failure("No fields to update.");
  }

  const { data, error } = await supabase
    .from("projects")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}

export async function deleteProject(
  supabase: SupabaseServerClient,
  id: string,
): Promise<ActionResult<void>> {
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) return failure(mapPostgrestError(error));
  return success(undefined);
}

export async function listProjects(
  supabase: SupabaseServerClient,
): Promise<ActionResult<ProjectRow[]>> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (error) return failure(mapPostgrestError(error));
  return success(data ?? []);
}
