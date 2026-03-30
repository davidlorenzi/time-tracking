import type { Metadata } from "next";

import { ProjectsPageClient } from "@/components/projects/projects-page-client";
import { listClients } from "@/lib/data/clients";
import { listProjects } from "@/lib/data/projects";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [clientsRes, projectsRes] = await Promise.all([
    listClients(supabase),
    listProjects(supabase),
  ]);

  const clients = clientsRes.ok
    ? clientsRes.data.map((c) => ({ id: c.id, name: c.name }))
    : [];

  const listError =
    !clientsRes.ok && !projectsRes.ok
      ? `${clientsRes.error} · ${projectsRes.error}`
      : !clientsRes.ok
        ? clientsRes.error
        : !projectsRes.ok
          ? projectsRes.error
          : null;

  return (
    <ProjectsPageClient
      initialProjects={projectsRes.ok ? projectsRes.data : []}
      clients={clients}
      listError={listError}
    />
  );
}
