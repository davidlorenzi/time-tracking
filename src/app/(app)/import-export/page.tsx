import type { Metadata } from "next";

import { CsvExportButton } from "@/components/import-export/csv-export-button";
import { CsvImportWizard } from "@/components/import-export/csv-import-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as projectsRepo from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Import / export",
};

export default async function ImportExportPage() {
  const supabase = await createClient();
  const projRes = await projectsRepo.listProjects(supabase);
  const projectNames = projRes.ok
    ? projRes.data.map((p) => p.name)
    : [];

  return (
    <>
      <PageHeader
        title="Import / export"
        description="Download time entries as CSV or import from a spreadsheet with column mapping and validation."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>
              CSV includes date, duration, description, client, project, and
              billable / invoiced / tracked-external flags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvExportButton />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <CsvImportWizard projectNames={projectNames} />
        </div>
      </div>
    </>
  );
}
