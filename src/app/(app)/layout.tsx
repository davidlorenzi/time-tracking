import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import * as projectsRepo from "@/lib/data/projects";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const res = await projectsRepo.listProjects(supabase);
  const projects = res.ok
    ? res.data
        .filter((p) => p.status === "Active")
        .map((p) => ({ id: p.id, name: p.name, default_billable: p.default_billable }))
    : [];

  return <AppShell projects={projects}>{children}</AppShell>;
}
