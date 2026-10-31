import type { Metadata } from "next";

import { CsvExportButton } from "@/components/import-export/csv-export-button";
import { CsvImportWizard } from "@/components/import-export/csv-import-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as projectsRepo from "@/lib/data/projects";
import * as clientsRepo from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Import / export",
};

export default async function ImportExportPage() {
  const supabase = await createClient();
  const [projRes, clientsRes] = await Promise.all([
    projectsRepo.listProjects(supabase),
    clientsRepo.listClients(supabase),
  ]);
  const projectNames = projRes.ok
    ? projRes.data.map((p) => p.name)
    : [];

  return (
    <>
      <PageHeader
        title="Import / export"
        description="Download time entries as CSV or import from a spreadsheet with column mapping and validation."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>
              Filter by date range, clients, projects and flags. CSV includes date,
              duration, description, client, project, and billable / invoiced /
              tracked-external flags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvExportButton
              clients={clientsRes.ok ? clientsRes.data.map((c) => ({ id: c.id, name: c.name })) : []}
              projects={projRes.ok ? projRes.data.map((p) => ({ id: p.id, name: p.name, client_id: p.client_id })) : []}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <CsvImportWizard projectNames={projectNames} />
        </div>
      </div>
    </>
  );
}
