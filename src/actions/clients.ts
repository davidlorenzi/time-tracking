"use server";

import { revalidateAppData } from "@/lib/cache";
import * as clientsRepo from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/actions";
import type { ClientRow } from "@/lib/types/database";
import { parseActionInput } from "@/lib/validation/parse-action-input";
import {
  clientCreateSchema,
  clientIdSchema,
  clientUpdateSchema,
} from "@/lib/validation/clients";

export async function createClientAction(
  input: unknown,
): Promise<ActionResult<ClientRow>> {
  const parsed = parseActionInput(clientCreateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await clientsRepo.createClient(supabase, parsed.data);
  if (result.ok) revalidateAppData();
  return result;
}

export async function updateClientAction(
  input: unknown,
): Promise<ActionResult<ClientRow>> {
  const parsed = parseActionInput(clientUpdateSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await clientsRepo.updateClient(supabase, parsed.data);
  if (result.ok) revalidateAppData();
  return result;
}

export async function deleteClientAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = parseActionInput(clientIdSchema, input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const result = await clientsRepo.deleteClient(supabase, parsed.data.id);
  if (result.ok) revalidateAppData();
  return result;
}

export async function listClientsAction(): Promise<ActionResult<ClientRow[]>> {
  const supabase = await createClient();
  return clientsRepo.listClients(supabase);
}
