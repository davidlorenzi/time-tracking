import type { ZodError } from "zod";
import { z } from "zod";

export function formatZodError(error: ZodError): string {
  return error.issues.map((i) => i.message).join("; ");
}

export const uuidSchema = z.string().uuid();
