import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb color");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const settingsUpdateSchema = z.object({
  billable_threshold_hours: z.coerce.number().min(0).max(24),
  colors: z.object({
    workday: hex,
    weekend: hex,
    holiday: hex,
    below_threshold: hex,
    reached_threshold: hex,
    over_threshold: hex,
  }),
  extra_holidays: z.array(isoDate).max(500),
  work_days: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one work day"),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
