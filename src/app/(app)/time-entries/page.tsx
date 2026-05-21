import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeEntriesTable } from "@/components/time/time-entries-table";
import * as clientsRepo from "@/lib/data/clients";
import * as entriesRepo from "@/lib/data/time-entries";
import { createClient } from "@/lib/supabase/server";
import * as projectsRepo from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Time entries",
};

export default async function TimeEntriesPage() {
  const supabase = await createClient();
  const [entriesRes, projectsRes, clientsRes] = await Promise.all([
    entriesRepo.listTimeEntriesWithProjects(supabase),
    projectsRepo.listProjects(supabase),
    clientsRepo.listClients(supabase),
  ]);

  const entries = entriesRes.ok ? entriesRes.data : [];
  const projects = projectsRes.ok
    ? projectsRes.data.map((p) => ({
        id: p.id,
        name: p.name,
        default_billable: p.default_billable,
        client_id: p.client_id,
      }))
    : [];
  const clients = clientsRes.ok
    ? clientsRes.data.map((c) => ({ id: c.id, name: c.name }))
    : [];

  return (
    <>
      <PageHeader
        title="Time entries"
        description="Use the quick bar for new logs. Filter by client, project, or flags; edit inline; remove when needed."
      />

      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4 sm:px-0">
          <TimeEntriesTable
            initialEntries={entries}
            projects={projects}
            clients={clients}
          />
        </CardContent>
      </Card>
    </>
  );
}
