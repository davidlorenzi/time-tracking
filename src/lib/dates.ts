/** Local calendar date as YYYY-MM-DD (for `<input type="date">` and API). */
export function localISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday range in local time for the week containing `d`. */
export function weekRangeContaining(d: Date): { from: string; to: string } {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  const monday = copy;
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: localISODate(monday), to: localISODate(sunday) };
}

export function monthCalendarRange(
  year: number,
  month: number,
): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

/** Shift a YYYY-MM-DD by `days` (local). */
export function addDaysToISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return localISODate(dt);
}

/** `type="month"` value YYYY-MM → { year, month }. */
export function parseMonthValue(value: string): { year: number; month: number } {
  const [ys, ms] = value.split("-");
  return { year: Number(ys), month: Number(ms) };
}

export function formatMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
