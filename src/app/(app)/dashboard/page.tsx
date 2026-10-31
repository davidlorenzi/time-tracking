import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageHeader } from "@/components/layout/page-header";
import { getSettingsRow } from "@/lib/data/settings";
import { getSummaryForRange } from "@/lib/data/summaries";
import { monthCalendarRange } from "@/lib/dates";
import { resolveSettings } from "@/lib/settings-defaults";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const now = new Date();
  const monthR = monthCalendarRange(now.getFullYear(), now.getMonth() + 1);

  const supabase = await createClient();
  const [summary, settingsRes] = await Promise.all([
    getSummaryForRange(supabase, monthR.from, monthR.to, { withComparison: true }),
    getSettingsRow(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Hours, billable split, revenue (hourly and flat-rate projects) and trends vs the previous period."
      />
      <DashboardView
        initialSummary={summary.ok ? summary.data : null}
        initialFrom={monthR.from}
        initialTo={monthR.to}
        settings={resolveSettings(settingsRes.ok ? settingsRes.data : null)}
      />
    </>
  );
}
