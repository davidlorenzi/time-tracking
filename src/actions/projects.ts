"use server";

import { revalidateAppData } from "@/lib/cache";
import * as projectsRepo from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { ProjectRow } from "@/lib/types/database";
import { parseActionInput } from "@/lib/validation/parse-action-input";
import {
  projectCreateSchema,
  projectIdSchema,
  projectUpdateSchema,
} from "@/lib/validation/projects";

export async function createProjectAction(
  input: unknown,
): Promise<ActionResult<ProjectRow>> {
  const parsed = parseActionInput(projectCreateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await projectsRepo.createProject(supabase, parsed.data);
  if (result.ok) revalidateAppData();
  return result;
}

export async function updateProjectAction(
  input: unknown,
): Promise<ActionResult<ProjectRow>> {
  const parsed = parseActionInput(projectUpdateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await projectsRepo.updateProject(supabase, parsed.data);
  if (result.ok) revalidateAppData();
  return result;
}

export async function deleteProjectAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = parseActionInput(projectIdSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await projectsRepo.deleteProject(supabase, parsed.data.id);
  if (result.ok) revalidateAppData();
  return result;
}

export async function listProjectsAction(): Promise<ActionResult<ProjectRow[]>> {
  const supabase = await createClient();
  return projectsRepo.listProjects(supabase);
}
