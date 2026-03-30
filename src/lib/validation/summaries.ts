import { z } from "zod";

export const summaryRangeSchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD"),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD"),
  })
  .refine((v) => v.from <= v.to, {
    message: "`from` must be on or before `to`",
    path: ["to"],
  });

export const monthlySummarySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
