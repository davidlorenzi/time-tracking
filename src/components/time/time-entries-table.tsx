"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteTimeEntryAction,
  updateTimeEntryAction,
} from "@/actions/time-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TimeEntryListRow } from "@/lib/data/time-entries";
import { dispatchAppDataRefresh } from "@/lib/app-events";
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

type TriState = "all" | "yes" | "no";

function matchesTriState(value: boolean, filter: TriState): boolean {
  if (filter === "all") return true;
  if (filter === "yes") return value === true;
  return value === false;
}

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
  onRowRemove,
}: {
  row: TimeEntryListRow;
  projects: QuickAddProjectOption[];
  onRowUpdate: (next: TimeEntryListRow) => void;
  onRowError: (id: string, message: string | null) => void;
  onRowRemove: (id: string) => void;
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

  const onDelete = () => {
    if (!window.confirm("Remove this time entry? This cannot be undone.")) {
      return;
    }
    onRowError(row.id, null);
    void (async () => {
      setBusy(true);
      const res = await deleteTimeEntryAction({ id: row.id });
      setBusy(false);
      if (!res.ok) {
        onRowError(row.id, res.error);
        return;
      }
      onRowRemove(row.id);
      dispatchAppDataRefresh();
    })();
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
      <TableTd className="w-[4.5rem] align-top">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
          disabled={busy}
          onClick={onDelete}
        >
          Remove
        </Button>
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
  const [filterBillable, setFilterBillable] = useState<TriState>("all");
  const [filterInvoiced, setFilterInvoiced] = useState<TriState>("all");
  const [filterTrackedExternal, setFilterTrackedExternal] =
    useState<TriState>("all");

  /* Sync when RSC refreshes (e.g. quick add); avoids stale list after router.refresh(). */
  useEffect(() => {
    setRows(initialEntries);
  }, [initialEntries]);

  const onRowUpdate = useCallback((next: TimeEntryListRow) => {
    setRows((rs) => rs.map((r) => (r.id === next.id ? next : r)));
  }, []);

  const onRowRemove = useCallback((id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }, []);

  const onRowError = useCallback((id: string, message: string | null) => {
    setRowErrors((prev) => {
      const n = { ...prev };
      if (message == null) delete n[id];
      else n[id] = message;
      return n;
    });
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter(
      (r) =>
        matchesTriState(r.billable, filterBillable) &&
        matchesTriState(r.invoiced, filterInvoiced) &&
        matchesTriState(r.tracked_external, filterTrackedExternal),
    );
  }, [rows, filterBillable, filterInvoiced, filterTrackedExternal]);

  const filterSelectClass =
    "h-8 border-zinc-200/80 bg-transparent text-xs dark:border-zinc-700/80";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 px-4 sm:px-5">
        <div className="flex min-w-[6.5rem] flex-col gap-1">
          <Label htmlFor="filter-billable" className="text-xs">
            Billable
          </Label>
          <Select
            id="filter-billable"
            value={filterBillable}
            onChange={(e) => setFilterBillable(e.target.value as TriState)}
            className={filterSelectClass}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
        <div className="flex min-w-[6.5rem] flex-col gap-1">
          <Label htmlFor="filter-invoiced" className="text-xs">
            Invoiced
          </Label>
          <Select
            id="filter-invoiced"
            value={filterInvoiced}
            onChange={(e) => setFilterInvoiced(e.target.value as TriState)}
            className={filterSelectClass}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
        <div className="flex min-w-[6.5rem] flex-col gap-1">
          <Label htmlFor="filter-external" className="text-xs">
            Tracked ext.
          </Label>
          <Select
            id="filter-external"
            value={filterTrackedExternal}
            onChange={(e) =>
              setFilterTrackedExternal(e.target.value as TriState)
            }
            className={filterSelectClass}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
      </div>

      <TableWrap>
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Date</TableTh>
              <TableTh>Project</TableTh>
              <TableTh>Description</TableTh>
              <TableTh className="text-right">Hrs</TableTh>
              <TableTh className="min-w-[9rem]">Flags</TableTh>
              <TableTh className="w-[5rem]" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableTd
                  colSpan={6}
                  className="py-12 text-center text-sm text-zinc-500"
                >
                  No entries yet. Use the bar above — description, project,
                  hours, then Add (or ⌘↵).
                </TableTd>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableTd
                  colSpan={6}
                  className="py-12 text-center text-sm text-zinc-500"
                >
                  No entries match the current filters.
                </TableTd>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <EditableRow
                  key={entryFieldSyncKey(row)}
                  row={row}
                  projects={projects}
                  onRowUpdate={onRowUpdate}
                  onRowError={onRowError}
                  onRowRemove={onRowRemove}
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
