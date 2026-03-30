import type { Metadata } from "next";

import { ClientsPageClient } from "@/components/clients/clients-page-client";
import { listClients } from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Clients",
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const res = await listClients(supabase);

  return (
    <ClientsPageClient
      initialClients={res.ok ? res.data : []}
      listError={res.ok ? null : res.error}
    />
  );
}
