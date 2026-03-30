import { z } from "zod";

import type { ActionResult } from "@/lib/types/actions";
import { failure } from "@/lib/types/actions";
import { formatZodError } from "@/lib/validation/common";

export function parseActionInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): ActionResult<z.infer<Schema>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return failure(formatZodError(parsed.error));
  return { ok: true, data: parsed.data };
}
