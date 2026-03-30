"use client";

import { useState, useTransition } from "react";

import { exportTimeEntriesCsvAction } from "@/actions/import-export";
import { Button } from "@/components/ui/button";
import { localISODate } from "@/lib/dates";

export function CsvExportButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const download = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await exportTimeEntriesCsvAction();
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `time-entries-${localISODate()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Download started.");
    });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={download}
      >
        {pending ? "Preparing…" : "Export time entries (CSV)"}
      </Button>
      {message ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
      ) : null}
    </div>
  );
}
