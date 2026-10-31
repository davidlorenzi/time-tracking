import { z } from "zod";

import { uuidSchema } from "@/lib/validation/common";

export const projectStatusSchema = z.enum([
  "Active",
  "Completed",
  "On Hold",
] as const);

export const billingTypeSchema = z.enum([
  "hourly",
  "fixed_budget",
  "fixed_monthly",
] as const);

const flatAmountSchema = z.coerce.number().min(0).max(100_000_000);
const budgetHoursSchema = z.coerce.number().positive().max(100_000);

export const projectCreateSchema = z
  .object({
  name: z.string().trim().min(1, "Name is required").max(500),
  status: projectStatusSchema.optional().default("Active"),
  client_id: uuidSchema,
  description: z.string().trim().max(20_000).optional(),
  default_billable: z.boolean().default(true),
  billing_type: billingTypeSchema.default("hourly"),
  flat_amount: flatAmountSchema.nullable().optional(),
  budget_hours: budgetHoursSchema.nullable().optional(),
  })
  .refine(
    (v) => v.billing_type === "hourly" || v.flat_amount != null,
    { message: "Flat amount is required for flat-rate projects", path: ["flat_amount"] },
  )
  .refine(
    (v) => v.billing_type !== "fixed_budget" || v.budget_hours != null,
    { message: "Budget hours are required for budget flat-rate projects", path: ["budget_hours"] },
  );

export const projectUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(500).optional(),
  status: projectStatusSchema.optional(),
  client_id: uuidSchema.optional(),
  description: z.string().trim().max(20_000).nullable().optional(),
  default_billable: z.boolean().optional(),
  billing_type: billingTypeSchema.optional(),
  flat_amount: flatAmountSchema.nullable().optional(),
  budget_hours: budgetHoursSchema.nullable().optional(),
});

export const projectIdSchema = z.object({
  id: uuidSchema,
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
