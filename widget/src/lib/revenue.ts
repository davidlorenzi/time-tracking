/** Implied revenue from an 8h day x hours worked. Mirrors src/lib/data/revenue.ts in the main app. */
export function lineRevenue(
  dailyRate: number,
  durationHours: number,
  billable: boolean,
): number {
  if (!billable || dailyRate <= 0 || durationHours <= 0) return 0;
  return (dailyRate / 8) * durationHours;
}

export type BillingType = "hourly" | "fixed_budget" | "fixed_monthly";

export type RevenueEntry = {
  date: string;
  hours: number;
  billable: boolean;
  projectId: string;
  billingType: BillingType;
  dailyRate: number;
  flatAmount: number | null;
  budgetHours: number | null;
};

export type RevenueContext = {
  /** Billable hours already logged on each fixed_budget project before the period starts. */
  priorBudgetHours: Map<string, number>;
  /** `projectId|YYYY-MM` -> date on which that month's flat amount is recognized. */
  monthlyRecognition: Map<string, string>;
};

/**
 * Revenue for a period, mirroring buildSummary in src/lib/data/summaries.ts of the main app:
 * hourly = daily rate / 8 x hours; fixed_budget = flat_amount / budget_hours per billable hour
 * until the budget is used up; fixed_monthly = flat_amount once per month, on the date of the
 * project's last billable entry that month.
 */
export function computeRevenue(
  entries: RevenueEntry[],
  range: { from: string; to: string },
  ctx: RevenueContext,
): number {
  const budgetRunning = new Map(ctx.priorBudgetHours);
  const projects = new Map<string, RevenueEntry>();
  let revenue = 0;

  const ordered = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of ordered) {
    if (!projects.has(e.projectId)) projects.set(e.projectId, e);

    if (e.billingType === "hourly") {
      revenue += lineRevenue(e.dailyRate, e.hours, e.billable);
    } else if (e.billingType === "fixed_budget" && e.billable) {
      const budget = e.budgetHours ?? 0;
      const flat = e.flatAmount ?? 0;
      if (budget > 0 && flat > 0) {
        const used = budgetRunning.get(e.projectId) ?? 0;
        const within = Math.max(0, Math.min(e.hours, budget - used));
        revenue += (flat / budget) * within;
        budgetRunning.set(e.projectId, used + e.hours);
      }
    }
  }

  for (const [key, date] of ctx.monthlyRecognition) {
    if (date < range.from || date > range.to) continue;
    const project = projects.get(key.split("|")[0]);
    if (project?.billingType !== "fixed_monthly") continue;
    revenue += project.flatAmount ?? 0;
  }

  return revenue;
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
