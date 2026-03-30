"use server";

import * as summariesRepo from "@/lib/data/summaries";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { PeriodSummary } from "@/lib/data/summaries";
import { parseActionInput } from "@/lib/validation/parse-action-input";
import {
  monthlySummarySchema,
  summaryRangeSchema,
} from "@/lib/validation/summaries";

export async function getWeeklySummaryAction(
  input: unknown,
): Promise<ActionResult<PeriodSummary>> {
  const parsed = parseActionInput(summaryRangeSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  return summariesRepo.getWeeklySummary(
    supabase,
    parsed.data.from,
    parsed.data.to,
  );
}

export async function getMonthlySummaryAction(
  input: unknown,
): Promise<ActionResult<PeriodSummary>> {
  const parsed = parseActionInput(monthlySummarySchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  return summariesRepo.getMonthlySummary(
    supabase,
    parsed.data.year,
    parsed.data.month,
  );
}
