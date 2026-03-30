import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const csvImportEntrySchema = z.object({
  date: isoDate,
  duration_hours: z.number().positive(),
  description: z.string().max(20_000).default(""),
  projectName: z.string().min(1).max(500),
  billable: z.boolean().default(true),
  invoiced: z.boolean().default(false),
  tracked_external: z.boolean().default(false),
});

export const csvImportBatchSchema = z.object({
  entries: z.array(csvImportEntrySchema).min(1).max(5000),
});

export type CsvImportEntry = z.infer<typeof csvImportEntrySchema>;
