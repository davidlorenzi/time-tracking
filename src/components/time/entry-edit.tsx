"use client";

import { useCallback, useState } from "react";

import {
  deleteTimeEntryAction,
  updateTimeEntryAction,
} from "@/actions/time-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { TimeEntryListRow } from "@/lib/data/time-entries";
import { dispatchAppDataRefresh } from "@/lib/app-events";
import { cn } from "@/lib/cn";

// Richer than QuickAddProjectOption — carries client_id for filtering.
export type ProjectOption = {
  id: string;
  name: string;
  default_billable: boolean;
  client_id: string;
};

export type ClientOption = { id: string; name: string };

export type EntryEditCallbacks = {
  onRowUpdate: (next: TimeEntryListRow) => void;
  onRowError: (id: string, message: string | null) => void;
  onRowRemove: (id: string) => void;
};

export function useEntryEdit(
  row: TimeEntryListRow,
  projects: ProjectOption[],
  { onRowUpdate, onRowError, onRowRemove }: EntryEditCallbacks,
) {
  const [date, setDate] = useState(row.date);
  const [description, setDescription] = useState(row.description);
  const [duration, setDuration] = useState(String(row.duration_hours));
  const [projectId, setProjectId] = useState(row.project_id);
  const [busy, setBusy] = useState(false);
  const { confirm } = useToast();

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
      dispatchAppDataRefresh();
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
        dispatchAppDataRefresh();
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
    void (async () => {
      const ok = await confirm({
        title: "Remove this time entry?",
        message: "This cannot be undone.",
        confirmLabel: "Remove",
        danger: true,
      });
      if (!ok) return;
      onRowError(row.id, null);
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

  return {
    date, setDate,
    description, setDescription,
    duration, setDuration,
    projectId,
    busy,
    onDateBlur, onDescBlur, onDurationBlur, onProjectChange, onDelete, flipFlag,
  };
}

export function ToggleChip({
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

export function EntryCard({
  row,
  projects,
  rowError,
  onRowUpdate,
  onRowError,
  onRowRemove,
  onOpenProject,
}: {
  row: TimeEntryListRow;
  projects: ProjectOption[];
  /** When set, shows a "History" button to inspect the project's recent entries. */
  onOpenProject?: (projectId: string) => void;
  rowError: string | undefined;
  onRowUpdate: (next: TimeEntryListRow) => void;
  onRowError: (id: string, message: string | null) => void;
  onRowRemove: (id: string) => void;
}) {
  const {
    date, setDate,
    description, setDescription,
    duration, setDuration,
    projectId,
    busy,
    onDateBlur, onDescBlur, onDurationBlur, onProjectChange, onDelete, flipFlag,
  } = useEntryEdit(row, projects, { onRowUpdate, onRowError, onRowRemove });

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-3 space-y-2 dark:border-zinc-800 dark:bg-zinc-900",
        busy && "opacity-60",
      )}
    >
      {/* Date + hours on one line */}
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={onDateBlur}
          disabled={busy}
          className="h-10 flex-1 border-zinc-200/80 bg-transparent px-2 text-sm dark:border-zinc-700/80"
        />
        <div className="flex shrink-0 items-center gap-1">
          <Input
            type="text"
            inputMode="decimal"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onBlur={onDurationBlur}
            disabled={busy}
            className="h-10 w-16 border-zinc-200/80 bg-transparent px-2 text-right text-sm tabular-nums dark:border-zinc-700/80"
            aria-label="Hours"
          />
          <span className="text-xs text-zinc-400">h</span>
        </div>
      </div>

      {/* Project */}
      <Select
        value={projectId}
        onChange={(e) => onProjectChange(e.target.value)}
        disabled={busy}
        className="h-10 w-full border-zinc-200/80 bg-transparent text-sm dark:border-zinc-700/80"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>

      {/* Description */}
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={onDescBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        disabled={busy}
        className="h-10 w-full border-zinc-200/80 bg-transparent text-sm dark:border-zinc-700/80"
        placeholder="Description"
      />

      {/* Flags + remove */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <ToggleChip label="Bill" pressed={row.billable} disabled={busy} onClick={() => flipFlag("billable")} />
          <ToggleChip label="Inv" pressed={row.invoiced} disabled={busy} onClick={() => flipFlag("invoiced")} />
          <ToggleChip label="Ext" pressed={row.tracked_external} disabled={busy} onClick={() => flipFlag("tracked_external")} />
        </div>
        {onOpenProject ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onOpenProject(row.project_id)}
          >
            History
          </Button>
        ) : null}
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
      </div>

      {rowError ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">{rowError}</p>
      ) : null}
    </div>
  );
}
