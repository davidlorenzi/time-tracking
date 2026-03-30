import { z } from "zod";

import { uuidSchema } from "@/lib/validation/common";

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(500),
  daily_rate: z.coerce.number().nonnegative("Daily rate must be zero or positive"),
  notes: z.string().trim().max(10_000).optional(),
});

export const clientUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(500).optional(),
  daily_rate: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
});

export const clientIdSchema = z.object({
  id: uuidSchema,
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
