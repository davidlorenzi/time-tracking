"use server";

import { revalidateAppData } from "@/lib/cache";
import * as settingsRepo from "@/lib/data/settings";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { AppSettingsRow } from "@/lib/types/database";
import { parseActionInput } from "@/lib/validation/parse-action-input";
import { settingsUpdateSchema } from "@/lib/validation/settings";

export async function updateSettingsAction(
  input: unknown,
): Promise<ActionResult<AppSettingsRow>> {
  const parsed = parseActionInput(settingsUpdateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await settingsRepo.updateSettings(supabase, parsed.data);
  if (result.ok) revalidateAppData();
  return result;
}
