import type { AppSettingsRow, SettingsColors } from "@/lib/types/database";

export const DEFAULT_COLORS: SettingsColors = {
  workday: "#ffffff",
  weekend: "#e4e4e7",
  holiday: "#fecaca",
  below_threshold: "#f59e0b",
  reached_threshold: "#10b981",
  over_threshold: "#0ea5e9",
};

export type ResolvedSettings = {
  billableThresholdHours: number;
  colors: SettingsColors;
  extraHolidays: string[];
  workDays: number[];
};

export const DEFAULT_SETTINGS: ResolvedSettings = {
  billableThresholdHours: 6,
  colors: DEFAULT_COLORS,
  extraHolidays: [],
  workDays: [1, 2, 3, 4, 5],
};

export function resolveSettings(row: AppSettingsRow | null): ResolvedSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    billableThresholdHours: Number(row.billable_threshold_hours),
    colors: { ...DEFAULT_COLORS, ...row.colors },
    extraHolidays: row.extra_holidays ?? [],
    workDays: row.work_days?.length ? row.work_days.map(Number) : DEFAULT_SETTINGS.workDays,
  };
}
