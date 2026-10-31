"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TimeEntryListRow } from "@/lib/data/time-entries";
import { cn } from "@/lib/cn";
import {
  EntryCard,
  ToggleChip,
  useEntryEdit,
  type ClientOption,
  type ProjectOption,
} from "@/components/time/entry-edit";

export type { ClientOption, ProjectOption };

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
  projects: ProjectOption[];
  clients: ClientOption[];
  initialFilters?: {
    from: string;
    to: string;
    clientId: string;
    projectId: string;
  };
};


function EditableRow({
  row,
  projects,
  onRowUpdate,
  onRowError,
  onRowRemove,
}: {
  row: TimeEntryListRow;
  projects: ProjectOption[];
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
  clients,
  initialFilters,
}: TimeEntriesTableProps) {
  const [rows, setRows] = useState(initialEntries);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Flag filters
  const [filterBillable, setFilterBillable] = useState<TriState>("all");
  const [filterInvoiced, setFilterInvoiced] = useState<TriState>("all");
  const [filterTrackedExternal, setFilterTrackedExternal] = useState<TriState>("all");

  // Entity filters
  const [filterClientId, setFilterClientId] = useState(initialFilters?.clientId ?? "all");
  const [filterProjectId, setFilterProjectId] = useState(initialFilters?.projectId ?? "all");
  const [filterFrom, setFilterFrom] = useState(initialFilters?.from ?? "");
  const [filterTo, setFilterTo] = useState(initialFilters?.to ?? "");

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

  // project_id → client_id lookup (built once from props)
  const projectClientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.client_id);
    return map;
  }, [projects]);

  // When client filter changes, clear the project filter if the selected project
  // doesn't belong to the newly selected client.
  useEffect(() => {
    if (filterClientId !== "all" && filterProjectId !== "all") {
      const project = projects.find((p) => p.id === filterProjectId);
      if (project && project.client_id !== filterClientId) {
        setFilterProjectId("all");
      }
    }
  }, [filterClientId, filterProjectId, projects]);

  // Project options visible in the Project filter — narrowed by client filter.
  const visibleProjectOptions = useMemo(() => {
    if (filterClientId === "all") return projects;
    return projects.filter((p) => p.client_id === filterClientId);
  }, [projects, filterClientId]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (!matchesTriState(r.billable, filterBillable)) return false;
      if (!matchesTriState(r.invoiced, filterInvoiced)) return false;
      if (!matchesTriState(r.tracked_external, filterTrackedExternal)) return false;
      if (filterFrom && r.date < filterFrom) return false;
      if (filterTo && r.date > filterTo) return false;
      if (filterProjectId !== "all" && r.project_id !== filterProjectId) return false;
      if (filterClientId !== "all" && projectClientMap.get(r.project_id) !== filterClientId) return false;
      return true;
    });
  }, [rows, filterBillable, filterInvoiced, filterTrackedExternal, filterProjectId, filterClientId, filterFrom, filterTo, projectClientMap]);

  const sel = "h-8 border-zinc-200/80 bg-transparent text-xs dark:border-zinc-700/80";

  return (
    <div className="space-y-4">

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="space-y-2 px-4 sm:px-5">

        {/* Entity filters: project + client — wider, flex-1 on mobile */}
        {(projects.length > 0 || clients.length > 0) && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {clients.length > 1 && (
              <div className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:max-w-[14rem]">
                <Label htmlFor="filter-client" className="text-xs">Client</Label>
                <Select
                  id="filter-client"
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  className={sel}
                >
                  <option value="all">All clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            )}
            {projects.length > 1 && (
              <div className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:max-w-[14rem]">
                <Label htmlFor="filter-project" className="text-xs">Project</Label>
                <Select
                  id="filter-project"
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                  className={sel}
                >
                  <option value="all">All projects</option>
                  {visibleProjectOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Date range */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:max-w-[10rem]">
            <Label htmlFor="filter-from" className="text-xs">From</Label>
            <Input id="filter-from" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={sel} />
          </div>
          <div className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:max-w-[10rem]">
            <Label htmlFor="filter-to" className="text-xs">To</Label>
            <Input id="filter-to" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={sel} />
          </div>
        </div>

        {/* Flag filters: billable / invoiced / tracked ext. */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex min-w-[6rem] flex-col gap-1">
            <Label htmlFor="filter-billable" className="text-xs">Billable</Label>
            <Select
              id="filter-billable"
              value={filterBillable}
              onChange={(e) => setFilterBillable(e.target.value as TriState)}
              className={sel}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>
          <div className="flex min-w-[6rem] flex-col gap-1">
            <Label htmlFor="filter-invoiced" className="text-xs">Invoiced</Label>
            <Select
              id="filter-invoiced"
              value={filterInvoiced}
              onChange={(e) => setFilterInvoiced(e.target.value as TriState)}
              className={sel}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>
          <div className="flex min-w-[6rem] flex-col gap-1">
            <Label htmlFor="filter-external" className="text-xs">Tracked ext.</Label>
            <Select
              id="filter-external"
              value={filterTrackedExternal}
              onChange={(e) => setFilterTrackedExternal(e.target.value as TriState)}
              className={sel}
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Mobile: card list ──────────────────────────────────────── */}
      <div className="md:hidden space-y-2 px-4 sm:px-5">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            No entries yet. Use the bar above — description, project, hours, then Add (or ⌘↵).
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            No entries match the current filters.
          </p>
        ) : (
          filteredRows.map((row) => (
            <EntryCard
              key={entryFieldSyncKey(row)}
              row={row}
              projects={projects}
              rowError={rowErrors[row.id]}
              onRowUpdate={onRowUpdate}
              onRowError={onRowError}
              onRowRemove={onRowRemove}
            />
          ))
        )}
      </div>

      {/* ── Desktop: table ─────────────────────────────────────────── */}
      <div className="hidden md:block">
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
            className="px-4 text-xs text-red-600 dark:text-red-400 sm:px-5"
            role="alert"
          >
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}
