import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeEntriesTable } from "@/components/time/time-entries-table";
import * as entriesRepo from "@/lib/data/time-entries";
import { createClient } from "@/lib/supabase/server";
import * as projectsRepo from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Time entries",
};

export default async function TimeEntriesPage() {
  const supabase = await createClient();
  const [entriesRes, projectsRes] = await Promise.all([
    entriesRepo.listTimeEntriesWithProjects(supabase),
    projectsRepo.listProjects(supabase),
  ]);

  const entries = entriesRes.ok ? entriesRes.data : [];
  const projects = projectsRes.ok
    ? projectsRes.data.map((p) => ({ id: p.id, name: p.name }))
    : [];

  return (
    <>
      <PageHeader
        title="Time entries"
        description="Use the quick bar for new logs. Edit rows inline; Bill / Inv / Ext toggle instantly."
      />

      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4 sm:px-0">
          <TimeEntriesTable initialEntries={entries} projects={projects} />
        </CardContent>
      </Card>
    </>
  );
}
