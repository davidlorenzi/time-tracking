import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageHeader } from "@/components/layout/page-header";
import {
  formatMonthValue,
  monthCalendarRange,
  weekRangeContaining,
} from "@/lib/dates";
import { getSummaryForRange } from "@/lib/data/summaries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const now = new Date();
  const week = weekRangeContaining(now);
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthR = monthCalendarRange(y, m);

  const supabase = await createClient();
  const [wRes, moRes] = await Promise.all([
    getSummaryForRange(supabase, week.from, week.to),
    getSummaryForRange(supabase, monthR.from, monthR.to),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Weekly and monthly hours, billable split, and estimated revenue from client daily rates."
      />
      <DashboardView
        initialWeekSummary={wRes.ok ? wRes.data : null}
        initialMonthSummary={moRes.ok ? moRes.data : null}
        initialWeekFrom={week.from}
        initialWeekTo={week.to}
        initialMonthValue={formatMonthValue(y, m)}
      />
    </>
  );
}
