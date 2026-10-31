import { italianHolidays } from "@/lib/holidays";
import { isoDayOfWeek } from "@/lib/dates";
import type { ResolvedSettings } from "@/lib/settings-defaults";

export type DayKind = "workday" | "weekend" | "holiday";
export type ThresholdState = "none" | "below" | "reached" | "over";

export type DayInfo = {
  kind: DayKind;
  holidayName: string | null;
};

export function buildDayResolver(settings: ResolvedSettings) {
  const cache = new Map<number, Map<string, string>>();
  const extra = new Set(settings.extraHolidays);
  const work = new Set(settings.workDays);

  return function resolve(iso: string): DayInfo {
    const year = Number(iso.slice(0, 4));
    let hol = cache.get(year);
    if (!hol) {
      hol = italianHolidays(year);
      cache.set(year, hol);
    }
    const name = hol.get(iso) ?? (extra.has(iso) ? "Holiday" : null);
    if (name) return { kind: "holiday", holidayName: name };
    if (!work.has(isoDayOfWeek(iso))) return { kind: "weekend", holidayName: null };
    return { kind: "workday", holidayName: null };
  };
}

export function thresholdState(
  billableHours: number,
  threshold: number,
): ThresholdState {
  if (billableHours <= 0) return "none";
  if (threshold <= 0) return "reached";
  const eps = 1e-9;
  if (billableHours + eps < threshold) return "below";
  if (billableHours - eps > threshold) return "over";
  return "reached";
}

/** Black or white text depending on background luminance. */
export function readableText(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#171717";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#171717" : "#fafafa";
}
