"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  createTimeEntryAction,
  listEntriesForDayAction,
  listRecentEntriesForProjectAction,
} from "@/actions/time-entries";
import type { CalendarProject } from "@/components/calendar/calendar-view";
import { EntryCard, type ProjectOption } from "@/components/time/entry-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { dispatchAppDataRefresh } from "@/lib/app-events";
import type { TimeEntryListRow } from "@/lib/data/time-entries";
import { formatHours, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type Props = {
  date: string | null;
  projects: CalendarProject[];
  onClose: () => void;
  monthValue: string;
};

export function DayPanel({ date, projects, onClose }: Props) {
  const { toast } = useToast();
  const [dayData, setDayData] = useState<{ date: string; rows: TimeEntryListRow[] } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projectView, setProjectView] = useState<string | null>(null);
  const [recentData, setRecentData] = useState<{ projectId: string; rows: TimeEntryListRow[] } | null>(null);

  const rows = useMemo(
    () => (dayData && dayData.date === date ? dayData.rows : []),
    [dayData, date],
  );
  const loading = date !== null && dayData?.date !== date;
  const recent = recentData && recentData.projectId === projectView ? recentData.rows : [];
  const recentLoading = projectView !== null && recentData?.projectId !== projectView;

  const options: ProjectOption[] = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        name: p.active ? p.name : `${p.name} (inactive)`,
        default_billable: p.default_billable,
        client_id: p.client_id,
      })),
    [projects],
  );

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    listEntriesForDayAction({ date }).then((res) => {
      if (cancelled) return;
      if (res.ok) setDayData({ date, rows: res.data });
      else toast(res.error, "error");
    });
    return () => {
      cancelled = true;
    };
  }, [date, toast]);

  useEffect(() => {
    if (!projectView) return;
    let cancelled = false;
    listRecentEntriesForProjectAction({ projectId: projectView, limit: 15 }).then((res) => {
      if (cancelled) return;
      if (res.ok) setRecentData({ projectId: projectView, rows: res.data });
      else toast(res.error, "error");
    });
    return () => {
      cancelled = true;
    };
  }, [projectView, toast]);

  const onRowUpdate = useCallback((next: TimeEntryListRow) => {
    setDayData((prev) => prev && { ...prev, rows: prev.rows.map((r) => (r.id === next.id ? next : r)) });
  }, []);
  const onRowError = useCallback((id: string, message: string | null) => {
    setErrors((prev) => {
      const copy = { ...prev };
      if (message) copy[id] = message;
      else delete copy[id];
      return copy;
    });
  }, []);
  const onRowRemove = useCallback((id: string) => {
    setDayData((prev) => prev && { ...prev, rows: prev.rows.filter((r) => r.id !== id) });
  }, []);

  const addRow = useCallback(
    (row: TimeEntryListRow) => {
      if (row.date === date) {
        setDayData((prev) => prev && { ...prev, rows: [...prev.rows, row] });
      }
    },
    [date],
  );

  const total = rows.reduce((s, r) => s + Number(r.duration_hours), 0);
  const billable = rows.reduce((s, r) => s + (r.billable ? Number(r.duration_hours) : 0), 0);
  const viewProject = projectView ? projects.find((p) => p.id === projectView) : null;

  function close() {
    setProjectView(null);
    onClose();
  }

  return (
    <Sheet
      open={date !== null}
      onClose={close}
      title={projectView ? `Recent: ${viewProject?.name ?? "project"}` : date ? formatLongDate(date) : ""}
      description={
        projectView
          ? "Latest entries on this project"
          : loading
            ? "Loading…"
            : `${formatHours(billable)} billable · ${formatHours(total - billable)} non-billable`
      }
      headerLead={
        projectView ? (
          <button
            type="button"
            onClick={() => setProjectView(null)}
            aria-label="Back to day"
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ‹
          </button>
        ) : null
      }
    >
      {date && !projectView ? (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><Spinner label="Loading entries" /></div>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No entries for this day.
            </p>
          ) : (
            rows.map((row) => (
              <EntryCard
                key={row.id}
                row={row}
                projects={options}
                rowError={errors[row.id]}
                onRowUpdate={onRowUpdate}
                onRowError={onRowError}
                onRowRemove={onRowRemove}
                onOpenProject={setProjectView}
              />
            ))
          )}
          <AddEntryForm date={date} projects={projects} onCreated={addRow} />
        </div>
      ) : null}

      {date && projectView ? (
        <div className="space-y-2">
          {recentLoading ? (
            <div className="flex justify-center py-6"><Spinner label="Loading entries" /></div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-zinc-500">No entries yet for this project.</p>
          ) : (
            recent.map((r) => (
              <RecentRow
                key={r.id}
                entry={r}
                targetDate={date}
                onCopied={(row) => {
                  addRow(row);
                  toast(`Added to ${date}`, "success");
                }}
              />
            ))
          )}
        </div>
      ) : null}
    </Sheet>
  );
}

function RecentRow({
  entry,
  targetDate,
  onCopied,
}: {
  entry: TimeEntryListRow;
  targetDate: string;
  onCopied: (row: TimeEntryListRow) => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const res = await createTimeEntryAction({
        date: targetDate,
        duration_hours: entry.duration_hours,
        description: entry.description,
        project_id: entry.project_id,
        billable: entry.billable,
        invoiced: false,
        tracked_external: entry.tracked_external,
      });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      onCopied({ ...res.data, projects: entry.projects });
      dispatchAppDataRefresh();
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {entry.date} · {formatHours(Number(entry.duration_hours))}
          {!entry.billable ? <span className="ml-2 text-xs text-zinc-500">non-billable</span> : null}
        </p>
        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{entry.description || "—"}</p>
      </div>
      <Button variant="secondary" size="sm" disabled={pending} onClick={copy} className={cn("h-9 shrink-0")}>
        Copy to day
      </Button>
    </div>
  );
}

function AddEntryForm({
  date,
  projects,
  onCreated,
}: {
  date: string;
  projects: CalendarProject[];
  onCreated: (row: TimeEntryListRow) => void;
}) {
  const { toast } = useToast();
  const active = projects.filter((p) => p.active);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(active[0]?.id ?? "");
  const [hours, setHours] = useState("1");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(active[0]?.default_billable ?? true);
  const [pending, startTransition] = useTransition();

  function submit() {
    const h = Number.parseFloat(hours.replace(",", "."));
    if (!projectId) return toast("Select a project", "error");
    if (Number.isNaN(h) || h <= 0) return toast("Hours must be greater than 0", "error");
    startTransition(async () => {
      const res = await createTimeEntryAction({
        date,
        duration_hours: h,
        description: description.trim(),
        project_id: projectId,
        billable,
        invoiced: false,
        tracked_external: false,
      });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      const p = projects.find((x) => x.id === projectId);
      onCreated({ ...res.data, projects: p ? { id: p.id, name: p.name } : null });
      setDescription("");
      dispatchAppDataRefresh();
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)} disabled={active.length === 0}>
        + Add entry
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <Select
        value={projectId}
        onChange={(e) => {
          setProjectId(e.target.value);
          const p = active.find((x) => x.id === e.target.value);
          if (p) setBillable(p.default_billable);
        }}
        aria-label="Project"
      >
        {active.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          aria-label="Hours"
          className="w-20 text-right tabular-nums"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Description"
          aria-label="Description"
        />
      </div>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
        Billable
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>Done</Button>
        <Button onClick={submit} disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
      </div>
    </div>
  );
}
