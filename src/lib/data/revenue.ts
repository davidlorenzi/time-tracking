/**
 * Implied hourly rate from an 8h day × hours worked.
 */
export function lineRevenue(
  dailyRate: number,
  durationHours: number,
  billable: boolean,
): number {
  if (!billable || dailyRate <= 0 || durationHours <= 0) return 0;
  return (dailyRate / 8) * durationHours;
}

/** Postgres `numeric` may arrive as string over the wire. */
export function toNumber(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}
