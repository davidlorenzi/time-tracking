import type { Metadata } from "next";

import { SettingsForm } from "@/components/settings/settings-form";
import { getSettingsRow } from "@/lib/data/settings";
import { resolveSettings } from "@/lib/settings-defaults";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const res = await getSettingsRow(supabase);

  return (
    <SettingsForm
      initial={resolveSettings(res.ok ? res.data : null)}
      loadError={res.ok ? null : res.error}
    />
  );
}
