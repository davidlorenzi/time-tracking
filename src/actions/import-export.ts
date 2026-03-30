"use server";

import { revalidateAppData } from "@/lib/cache";
import * as entriesRepo from "@/lib/data/time-entries";
import * as projectsRepo from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import { toCsv } from "@/lib/csv";
import { normalizeProjectName } from "@/lib/csv-dates";
import { toNumber } from "@/lib/data/revenue";
import { parseActionInput } from "@/lib/validation/parse-action-input";
import { csvImportBatchSchema } from "@/lib/validation/csv-import";

function exportRowCells(
  r: entriesRepo.TimeEntryExportRow,
): string[] {
  const client = r.projects?.clients?.name ?? "";
  const project = r.projects?.name ?? "";
  const dur = String(toNumber(r.duration_hours));
  const desc = (r.description ?? "").replace(/\r?\n/g, " ");
  return [
    r.date,
    dur,
    desc,
    client,
    project,
    r.billable ? "true" : "false",
    r.invoiced ? "true" : "false",
    r.tracked_external ? "true" : "false",
  ];
}

export async function exportTimeEntriesCsvAction(): Promise<
  ActionResult<string>
> {
  const supabase = await createClient();
  const res = await entriesRepo.listTimeEntriesForExport(supabase);
  if (!res.ok) return res;

  const headers = [
    "date",
    "duration_hours",
    "description",
    "client",
    "project",
    "billable",
    "invoiced",
    "tracked_external",
  ];
  const rows = res.data.map(exportRowCells);
  return { ok: true, data: `\uFEFF${toCsv(headers, rows)}` };
}

const CHUNK = 150;

export async function importTimeEntriesAction(
  input: unknown,
): Promise<ActionResult<{ inserted: number }>> {
  const parsed = parseActionInput(csvImportBatchSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const projRes = await projectsRepo.listProjects(supabase);
  if (!projRes.ok) return projRes;

  const nameToId = new Map<string, string>();
  for (const p of projRes.data) {
    const key = normalizeProjectName(p.name);
    if (!nameToId.has(key)) nameToId.set(key, p.id);
  }

  const inserts: Array<{
    date: string;
    duration_hours: number;
    description: string;
    project_id: string;
    billable: boolean;
    invoiced: boolean;
    tracked_external: boolean;
  }> = [];

  for (const e of parsed.data.entries) {
    const pid = nameToId.get(normalizeProjectName(e.projectName));
    if (!pid) {
      return {
        ok: false,
        error: `Unknown project "${e.projectName}". Create it first or fix the name.`,
      };
    }
    inserts.push({
      date: e.date,
      duration_hours: e.duration_hours,
      description: e.description,
      project_id: pid,
      billable: e.billable,
      invoiced: e.invoiced,
      tracked_external: e.tracked_external,
    });
  }

  for (let i = 0; i < inserts.length; i += CHUNK) {
    const slice = inserts.slice(i, i + CHUNK);
    const { error } = await supabase.from("time_entries").insert(slice);
    if (error) {
      return {
        ok: false,
        error: `Import failed near row ${i + 1}: ${error.message}`,
      };
    }
  }

  revalidateAppData();
  return { ok: true, data: { inserted: inserts.length } };
}
