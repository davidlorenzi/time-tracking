import { z } from "zod";

import { uuidSchema } from "@/lib/validation/common";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const timeEntryCreateSchema = z.object({
  date: isoDate,
  duration_hours: z.coerce.number().positive("Duration must be greater than zero"),
  description: z.string().max(20_000).default(""),
  project_id: uuidSchema,
  tracked_external: z.boolean().optional().default(false),
  billable: z.boolean().optional().default(true),
  invoiced: z.boolean().optional().default(false),
});

export const timeEntryUpdateSchema = z.object({
  id: uuidSchema,
  date: isoDate.optional(),
  duration_hours: z.coerce.number().positive().optional(),
  description: z.string().max(20_000).optional(),
  project_id: uuidSchema.optional(),
  tracked_external: z.boolean().optional(),
  billable: z.boolean().optional(),
  invoiced: z.boolean().optional(),
});

export const timeEntryIdSchema = z.object({
  id: uuidSchema,
});

export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
export type TimeEntryUpdateInput = z.infer<typeof timeEntryUpdateSchema>;
