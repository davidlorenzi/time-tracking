/** Local calendar date as YYYY-MM-DD. Mirrors src/lib/dates.ts in the main app. */
export function localISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-Sunday range in local time for the week containing `d`. */
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
