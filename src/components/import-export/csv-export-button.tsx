"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  exportTimeEntriesCsvAction,
  previewTimeEntriesExportAction,
} from "@/actions/import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { localISODate, monthCalendarRange } from "@/lib/dates";
import { formatHours, formatNumber } from "@/lib/format";

type TriState = "all" | "yes" | "no";

type Props = {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; client_id: string }[];
};

function presetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  switch (preset) {
    case "this-month":
      return monthCalendarRange(y, m);
    case "last-month": {
      const d = new Date(y, m - 2, 1);
      return monthCalendarRange(d.getFullYear(), d.getMonth() + 1);
    }
    case "quarter": {
      const start = Math.floor((m - 1) / 3) * 3 + 1;
      return { from: monthCalendarRange(y, start).from, to: monthCalendarRange(y, start + 2).to };
    }
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:
      return { from: "", to: "" };
  }
}

const PRESETS = [
  ["this-month", "This month"],
  ["last-month", "Last month"],
  ["quarter", "This quarter"],
  ["year", "This year"],
  ["all", "All time"],
] as const;

function CheckList({
  title,
  items,
  selected,
  onToggle,
  onClear,
}: {
  title: string;
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <details className="group rounded-lg border border-zinc-200 dark:border-zinc-800">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium">
        <span>{title}</span>
        <span className="text-xs font-normal text-zinc-500">
          {selected.length === 0 ? "All" : `${selected.length} selected`}
        </span>
      </summary>
      <div className="max-h-56 space-y-0.5 overflow-y-auto border-t border-zinc-200 p-1 dark:border-zinc-800">
        {items.length === 0 ? (
          <p className="p-2 text-sm text-zinc-500">Nothing to select.</p>
        ) : (
          <>
            {selected.length > 0 ? (
              <button type="button" onClick={onClear} className="px-2 py-1 text-xs text-zinc-500 underline">
                Clear selection
              </button>
            ) : null}
            {items.map((it) => (
              <label key={it.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={selected.includes(it.id)}
                  onChange={() => onToggle(it.id)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="truncate">{it.name}</span>
              </label>
            ))}
          </>
        )}
      </div>
    </details>
  );
}

function TriSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as TriState)}>
        <option value="all">Any</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
    </div>
  );
}

export function CsvExportButton({ clients, projects }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [billable, setBillable] = useState<TriState>("all");
  const [invoiced, setInvoiced] = useState<TriState>("all");
  const [trackedExternal, setTrackedExternal] = useState<TriState>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ count: number; hours: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  const visibleProjects = useMemo(
    () => (clientIds.length === 0 ? projects : projects.filter((p) => clientIds.includes(p.client_id))),
    [projects, clientIds],
  );

  const filters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      clientIds,
      projectIds: projectIds.filter((id) => visibleProjects.some((p) => p.id === id)),
      billable,
      invoiced,
      trackedExternal,
      search: search.trim() || undefined,
    }),
    [from, to, clientIds, projectIds, visibleProjects, billable, invoiced, trackedExternal, search],
  );

  useEffect(() => {
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      const res = await previewTimeEntriesExportAction(filters);
      if (id !== requestId.current) return;
      if (res.ok) {
        setPreview(res.data);
        setPreviewError(null);
      } else {
        setPreview(null);
        setPreviewError(res.error);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const applyPreset = (p: string) => {
    const r = presetRange(p);
    setFrom(r.from);
    setTo(r.to);
  };

  const download = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await exportTimeEntriesCsvAction(filters);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const range = from || to ? `${from || "start"}_${to || "end"}` : localISODate();
      a.download = `time-entries-${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Download started.");
    });
  };

  const empty = preview?.count === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(([key, label]) => (
          <Button key={key} variant="secondary" size="sm" className="h-9" onClick={() => applyPreset(key)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="exp-from" className="text-xs">From</Label>
          <Input id="exp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="exp-to" className="text-xs">To</Label>
          <Input id="exp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CheckList
          title="Clients"
          items={clients}
          selected={clientIds}
          onToggle={(id) => setClientIds((l) => toggle(l, id))}
          onClear={() => setClientIds([])}
        />
        <CheckList
          title="Projects"
          items={visibleProjects}
          selected={filters.projectIds}
          onToggle={(id) => setProjectIds((l) => toggle(l, id))}
          onClear={() => setProjectIds([])}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TriSelect id="exp-billable" label="Billable" value={billable} onChange={setBillable} />
        <TriSelect id="exp-invoiced" label="Invoiced" value={invoiced} onChange={setInvoiced} />
        <TriSelect id="exp-ext" label="Tracked ext." value={trackedExternal} onChange={setTrackedExternal} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="exp-search" className="text-xs">Description contains</Label>
        <Input id="exp-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Optional text" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending || empty} onClick={download} className="w-full sm:w-auto">
          {pending ? "Preparing…" : "Export CSV"}
        </Button>
        <p className={cn("text-sm", previewError ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400")} aria-live="polite">
          {previewError ??
            (preview
              ? preview.count === 0
                ? "No entries match these filters."
                : `${formatNumber(preview.count, 0)} entries · ${formatHours(preview.hours)}`
              : "Counting…")}
        </p>
      </div>
      {message ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p> : null}
    </div>
  );
}
