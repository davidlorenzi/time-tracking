import type { Metadata } from "next";

import { CalendarView } from "@/components/calendar/calendar-view";
import { listProjects } from "@/lib/data/projects";
import { getSettingsRow } from "@/lib/data/settings";
import { getSummaryForRange } from "@/lib/data/summaries";
import { formatMonthValue, localISODate, monthCalendarRange, parseMonthValue } from "@/lib/dates";
import { resolveSettings } from "@/lib/settings-defaults";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Calendar",
};

type Props = { searchParams: Promise<{ m?: string }> };

export default async function CalendarPage({ searchParams }: Props) {
  const { m } = await searchParams;
  const today = localISODate();
  const monthValue = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : today.slice(0, 7);
  const { year, month } = parseMonthValue(monthValue);
  const range = monthCalendarRange(year, month);

  const supabase = await createClient();
  const [summary, settingsRes, projectsRes] = await Promise.all([
    getSummaryForRange(supabase, range.from, range.to),
    getSettingsRow(supabase),
    listProjects(supabase),
  ]);

  const days = summary.ok
    ? summary.data.byDay.map((d) => ({
        date: d.date,
        billableHours: d.billableHours,
        nonBillableHours: Math.max(0, d.hours - d.billableHours),
      }))
    : [];

  return (
    <CalendarView
      year={year}
      month={month}
      monthValue={formatMonthValue(year, month)}
      today={today}
      days={days}
      settings={resolveSettings(settingsRes.ok ? settingsRes.data : null)}
      projects={(projectsRes.ok ? projectsRes.data : []).map((p) => ({
        id: p.id,
        name: p.name,
        default_billable: p.default_billable,
        client_id: p.client_id,
        active: p.status === "Active",
      }))}
      loadError={summary.ok ? null : summary.error}
    />
  );
}
