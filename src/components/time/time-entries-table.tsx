"use client";

import { useCallback, useEffect, useState } from "react";

import { updateTimeEntryAction } from "@/actions/time-entries";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TimeEntryListRow } from "@/lib/data/time-entries";
import { cn } from "@/lib/cn";

import type { QuickAddProjectOption } from "./quick-add-time-bar";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  TableWrap,
} from "@/components/ui/table";

function entryFieldSyncKey(row: TimeEntryListRow) {
  return [
    row.id,
    row.date,
    row.description,
    String(row.duration_hours),
    row.project_id,
  ].join("\0");
}

type TimeEntriesTableProps = {
  initialEntries: TimeEntryListRow[];
  projects: QuickAddProjectOption[];
};

function ToggleChip({
  label,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-50",
        pressed
          ? "bg-emerald-600 text-white dark:bg-emerald-500"
          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
      )}
    >
      {label}
    </button>
  );
}

function EditableRow({
  row,
  projects,
  onRowUpdate,
  onRowError,
}: {
  row: TimeEntryListRow;
  projects: QuickAddProjectOption[];
  onRowUpdate: (next: TimeEntryListRow) => void;
  onRowError: (id: string, message: string | null) => void;
}) {
  const [date, setDate] = useState(row.date);
  const [description, setDescription] = useState(row.description);
  const [duration, setDuration] = useState(String(row.duration_hours));
  const [projectId, setProjectId] = useState(row.project_id);
  const [busy, setBusy] = useState(false);

  const mergeProject = useCallback(
    (pid: string): TimeEntryListRow["projects"] => {
      const p = projects.find((x) => x.id === pid);
      return p ? { id: p.id, name: p.name } : null;
    },
    [projects],
  );

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      onRowError(row.id, null);
      setBusy(true);
      const res = await updateTimeEntryAction({ id: row.id, ...body });
      setBusy(false);
      if (!res.ok) {
        onRowError(row.id, res.error);
        return;
      }
      onRowUpdate({
        ...row,
        ...res.data,
        projects: mergeProject(res.data.project_id) ?? row.projects,
      });
    },
    [mergeProject, onRowError, onRowUpdate, row],
  );

  const flipFlag = useCallback(
    (field: "billable" | "invoiced" | "tracked_external") => {
      const snapshot = row;
      const next = !snapshot[field];
      onRowError(snapshot.id, null);
      onRowUpdate({ ...snapshot, [field]: next });
      void (async () => {
        const res = await updateTimeEntryAction({
          id: snapshot.id,
          [field]: next,
        });
        if (!res.ok) {
          onRowUpdate(snapshot);
          onRowError(snapshot.id, res.error);
          return;
        }
        onRowUpdate({
          ...snapshot,
          ...res.data,
          projects: mergeProject(res.data.project_id) ?? snapshot.projects,
        });
      })();
    },
    [mergeProject, onRowError, onRowUpdate, row],
  );

  const onDateBlur = () => {
    if (date === row.date) return;
    void patch({ date });
  };

  const onDescBlur = () => {
    const t = description.trim();
    if (t === row.description) return;
    void patch({ description: t });
  };

  const onDurationBlur = () => {
    const h = Number.parseFloat(duration.replace(",", "."));
    if (Number.isNaN(h) || h <= 0) {
      setDuration(String(row.duration_hours));
      onRowError(row.id, "Hours must be greater than 0.");
      return;
    }
    const prev = Number(row.duration_hours);
    if (!Number.isNaN(prev) && Math.abs(h - prev) < 1e-9) return;
    void patch({ duration_hours: h });
  };

  const onProjectChange = (next: string) => {
    setProjectId(next);
    if (next === row.project_id) return;
    void patch({ project_id: next });
  };

  return (
    <TableRow className={cn(busy && "opacity-60")}>
      <TableTd className="w-[7.5rem] align-top">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={onDateBlur}
          disabled={busy}
          className="h-8 border-zinc-200/80 bg-transparent px-2 text-xs dark:border-zinc-700/80"
        />
      </TableTd>
      <TableTd className="min-w-[8rem] align-top">
        <Select
          value={projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          disabled={busy}
          className="h-8 border-zinc-200/80 bg-transparent text-xs dark:border-zinc-700/80"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </TableTd>
      <TableTd className="min-w-[12rem] align-top">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={onDescBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          disabled={busy}
          className="h-8 border-zinc-200/80 bg-transparent text-xs dark:border-zinc-700/80"
          placeholder="Description"
        />
      </TableTd>
      <TableTd className="w-16 text-right align-top">
        <Input
          type="text"
          inputMode="decimal"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onBlur={onDurationBlur}
          disabled={busy}
          className="h-8 border-zinc-200/80 bg-transparent px-2 text-right text-xs tabular-nums dark:border-zinc-700/80"
          aria-label="Hours"
        />
      </TableTd>
      <TableTd className="align-top">
        <div className="flex flex-wrap gap-1">
          <ToggleChip
            label="Bill"
            pressed={row.billable}
            disabled={busy}
            onClick={() => flipFlag("billable")}
          />
          <ToggleChip
            label="Inv"
            pressed={row.invoiced}
            disabled={busy}
            onClick={() => flipFlag("invoiced")}
          />
          <ToggleChip
            label="Ext"
            pressed={row.tracked_external}
            disabled={busy}
            onClick={() => flipFlag("tracked_external")}
          />
        </div>
      </TableTd>
    </TableRow>
  );
}

export function TimeEntriesTable({
  initialEntries,
  projects,
}: TimeEntriesTableProps) {
  const [rows, setRows] = useState(initialEntries);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  /* Sync when RSC refreshes (e.g. quick add); avoids stale list after router.refresh(). */
  useEffect(() => {
    setRows(initialEntries);
  }, [initialEntries]);

  const onRowUpdate = useCallback((next: TimeEntryListRow) => {
    setRows((rs) => rs.map((r) => (r.id === next.id ? next : r)));
  }, []);

  const onRowError = useCallback((id: string, message: string | null) => {
    setRowErrors((prev) => {
      const n = { ...prev };
      if (message == null) delete n[id];
      else n[id] = message;
      return n;
    });
  }, []);

  return (
    <div className="space-y-1">
      <TableWrap>
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Date</TableTh>
              <TableTh>Project</TableTh>
              <TableTh>Description</TableTh>
              <TableTh className="text-right">Hrs</TableTh>
              <TableTh className="min-w-[9rem]">Flags</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableTd
                  colSpan={5}
                  className="py-12 text-center text-sm text-zinc-500"
                >
                  No entries yet. Use the bar above — description, project,
                  hours, then Add (or ⌘↵).
                </TableTd>
              </TableRow>
            ) : (
              rows.map((row) => (
                <EditableRow
                  key={entryFieldSyncKey(row)}
                  row={row}
                  projects={projects}
                  onRowUpdate={onRowUpdate}
                  onRowError={onRowError}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableWrap>
      {Object.entries(rowErrors).map(([id, msg]) => (
        <p
          key={id}
          className="text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          {msg}
        </p>
      ))}
    </div>
  );
}
