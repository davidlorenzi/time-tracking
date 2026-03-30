import type { ActionResult } from "@/lib/types/actions";
import { failure, success } from "@/lib/types/actions";
import type { SupabaseServerClient } from "@/lib/supabase/types";
import type { ClientRow } from "@/lib/types/database";
import { mapPostgrestError } from "@/lib/data/postgrest-error";
import { optionalTextToNull } from "@/lib/data/normalize";
import type {
  ClientCreateInput,
  ClientUpdateInput,
} from "@/lib/validation/clients";

export async function createClient(
  supabase: SupabaseServerClient,
  input: ClientCreateInput,
): Promise<ActionResult<ClientRow>> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      daily_rate: input.daily_rate,
      notes: optionalTextToNull(input.notes),
    })
    .select()
    .single();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}

export async function updateClient(
  supabase: SupabaseServerClient,
  input: ClientUpdateInput,
): Promise<ActionResult<ClientRow>> {
  const { id, ...patch } = input;
  const row: Record<string, unknown> = {};

  if (patch.name !== undefined) row.name = patch.name;
  if (patch.daily_rate !== undefined) row.daily_rate = patch.daily_rate;
  if (patch.notes !== undefined) row.notes = optionalTextToNull(patch.notes);

  if (Object.keys(row).length === 0) {
    return failure("No fields to update.");
  }

  const { data, error } = await supabase
    .from("clients")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}

export async function deleteClient(
  supabase: SupabaseServerClient,
  id: string,
): Promise<ActionResult<void>> {
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) return failure(mapPostgrestError(error));
  return success(undefined);
}

export async function listClients(
  supabase: SupabaseServerClient,
): Promise<ActionResult<ClientRow[]>> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) return failure(mapPostgrestError(error));
  return success(data ?? []);
}
