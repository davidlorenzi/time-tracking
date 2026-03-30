"use server";

import { revalidateAppData } from "@/lib/cache";
import * as entriesRepo from "@/lib/data/time-entries";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { TimeEntryRow } from "@/lib/types/database";
import { parseActionInput } from "@/lib/validation/parse-action-input";
import {
  timeEntryCreateSchema,
  timeEntryIdSchema,
  timeEntryUpdateSchema,
} from "@/lib/validation/time-entries";

export async function createTimeEntryAction(
  input: unknown,
): Promise<ActionResult<TimeEntryRow>> {
  const parsed = parseActionInput(timeEntryCreateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await entriesRepo.createTimeEntry(supabase, parsed.data);
  if (result.ok) revalidateAppData();
  return result;
}

export async function updateTimeEntryAction(
  input: unknown,
): Promise<ActionResult<TimeEntryRow>> {
  const parsed = parseActionInput(timeEntryUpdateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await entriesRepo.updateTimeEntry(supabase, parsed.data);
  if (result.ok) revalidateAppData();
  return result;
}

export async function deleteTimeEntryAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = parseActionInput(timeEntryIdSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await entriesRepo.deleteTimeEntry(supabase, parsed.data.id);
  if (result.ok) revalidateAppData();
  return result;
}

