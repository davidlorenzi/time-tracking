"use server";

import { revalidateAppData } from "@/lib/cache";
import * as entriesRepo from "@/lib/data/time-entries";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { TimeEntryRow } from "@/lib/types/database";
import { z } from "zod";

import type { TimeEntryListRow } from "@/lib/data/time-entries";
import { uuidSchema } from "@/lib/validation/common";
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


const dayInputSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const projectRecentSchema = z.object({
  projectId: uuidSchema,
  limit: z.number().int().min(1).max(50).optional(),
});

export async function listEntriesForDayAction(
  input: unknown,
): Promise<ActionResult<TimeEntryListRow[]>> {
  const parsed = parseActionInput(dayInputSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createClient();
  return entriesRepo.listTimeEntriesForDate(supabase, parsed.data.date);
}

export async function listRecentEntriesForProjectAction(
  input: unknown,
): Promise<ActionResult<TimeEntryListRow[]>> {
  const parsed = parseActionInput(projectRecentSchema, input);
  if (!parsed.ok) return parsed;
  const supabase = await createClient();
  return entriesRepo.listRecentEntriesForProject(
    supabase,
    parsed.data.projectId,
    parsed.data.limit,
  );
}
