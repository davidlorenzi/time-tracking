import { z } from "zod";

import { uuidSchema } from "@/lib/validation/common";

export const projectStatusSchema = z.enum([
  "Active",
  "Completed",
  "On Hold",
] as const);

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(500),
  status: projectStatusSchema.optional().default("Active"),
  client_id: uuidSchema,
  description: z.string().trim().max(20_000).optional(),
});

export const projectUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(500).optional(),
  status: projectStatusSchema.optional(),
  client_id: uuidSchema.optional(),
  description: z.string().trim().max(20_000).nullable().optional(),
});

export const projectIdSchema = z.object({
  id: uuidSchema,
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
