import type { ActionResult } from "@/lib/types/actions";
import { failure, success } from "@/lib/types/actions";
import type { SupabaseServerClient } from "@/lib/supabase/types";
import type { AppSettingsRow } from "@/lib/types/database";
import { mapPostgrestError } from "@/lib/data/postgrest-error";
import type { SettingsUpdateInput } from "@/lib/validation/settings";

export async function getSettingsRow(
  supabase: SupabaseServerClient,
): Promise<ActionResult<AppSettingsRow | null>> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}

export async function updateSettings(
  supabase: SupabaseServerClient,
  input: SettingsUpdateInput,
): Promise<ActionResult<AppSettingsRow>> {
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({
      id: 1,
      billable_threshold_hours: input.billable_threshold_hours,
      colors: input.colors,
      extra_holidays: [...new Set(input.extra_holidays)].sort(),
      work_days: [...new Set(input.work_days)].sort(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return failure(mapPostgrestError(error));
  return success(data);
}
