"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import { importTimeEntriesAction } from "@/actions/import-export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { parseCsv } from "@/lib/csv";
import { parseBooleanLoose, parseFlexibleDate } from "@/lib/csv-dates";
import type { CsvImportEntry } from "@/lib/validation/csv-import";
import { cn } from "@/lib/cn";

const FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "duration_hours", label: "Duration (hours)", required: true },
  { key: "description", label: "Description", required: false },
  { key: "project", label: "Project name", required: true },
  { key: "billable", label: "Billable", required: false },
  { key: "invoiced", label: "Invoiced", required: false },
  { key: "tracked_external", label: "Tracked externally", required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type ColumnMap = Partial<Record<FieldKey, number>>;

function guessMapping(headers: string[]): ColumnMap {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const m: ColumnMap = {};
  norm.forEach((h, i) => {
    if (/^date$|datum|day/.test(h) || (h.includes("date") && !h.includes("update")))
      m.date = i;
    if (
      h.includes("duration") ||
      h === "hours" ||
      h === "hrs" ||
      (h.includes("hour") && !h.includes("date"))
    )
      m.duration_hours = i;
    if (h.includes("desc") || h === "notes" || h === "task")
      m.description = i;
    if (
      (h.includes("project") || h === "job") &&
      !h.includes("client") &&
      !h.includes("project_id")
    )
      m.project = i;
    if (h.includes("billable") || h === "bill") m.billable = i;
    if (h.includes("invoice")) m.invoiced = i;
    if (h.includes("external") || h.includes("toggl")) m.tracked_external = i;
  });
  return m;
}

function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  return row[idx]?.trim() ?? "";
}

function validateRow(
  row: string[],
  map: ColumnMap,
  rowIndex: number,
): { ok: true; data: CsvImportEntry } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const dateRaw = cell(row, map.date);
  const date = parseFlexibleDate(dateRaw);
  if (!date) errors.push(`Row ${rowIndex}: invalid date "${dateRaw}"`);

  const durRaw = cell(row, map.duration_hours);
  const dur = Number.parseFloat(durRaw.replace(",", "."));
  if (Number.isNaN(dur) || dur <= 0) {
    errors.push(`Row ${rowIndex}: invalid duration "${durRaw}"`);
  }

  const projectName = cell(row, map.project);
  if (!projectName) errors.push(`Row ${rowIndex}: missing project name`);

  const desc = cell(row, map.description) ?? "";

  let billable = true;
  const bRaw = cell(row, map.billable);
  if (bRaw) {
    const p = parseBooleanLoose(bRaw);
    if (p === null) errors.push(`Row ${rowIndex}: invalid billable "${bRaw}"`);
    else billable = p;
  }

  let invoiced = false;
  const iRaw = cell(row, map.invoiced);
  if (iRaw) {
    const p = parseBooleanLoose(iRaw);
    if (p === null) errors.push(`Row ${rowIndex}: invalid invoiced "${iRaw}"`);
    else invoiced = p;
  }

  let tracked_external = false;
  const eRaw = cell(row, map.tracked_external);
  if (eRaw) {
    const p = parseBooleanLoose(eRaw);
    if (p === null)
      errors.push(`Row ${rowIndex}: invalid tracked_external "${eRaw}"`);
    else tracked_external = p;
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      date: date!,
      duration_hours: dur,
      description: desc,
      projectName,
      billable,
      invoiced,
      tracked_external,
    },
  };
}

type CsvImportWizardProps = {
  projectNames: string[];
};

export function CsvImportWizard({ projectNames }: CsvImportWizardProps) {
  const [rawRows, setRawRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<ColumnMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const headers = rawRows?.[0] ?? [];
  const dataRows = useMemo(
    () =>
      rawRows && rawRows.length > 1 ? rawRows.slice(1) : ([] as string[][]),
    [rawRows],
  );

  const onFile = useCallback((file: File | null) => {
    setMessage(null);
    if (!file) {
      setRawRows(null);
      setMap({});
      return;
    }
    void file.text().then((text) => {
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setMessage("CSV needs a header row and at least one data row.");
        setRawRows(null);
        setMap({});
        return;
      }
      setRawRows(rows);
      setMap(guessMapping(rows[0] ?? []));
    });
  }, []);

  const mappingComplete = useMemo(() => {
    if (!rawRows) return false;
    if (map.date === undefined || map.duration_hours === undefined) return false;
    if (map.project === undefined) return false;
    return true;
  }, [map, rawRows]);

  const preview = useMemo(() => {
    if (!mappingComplete || dataRows.length === 0) return [];
    return dataRows.slice(0, 12).map((row, i) => {
      const r = validateRow(row, map, i + 2);
      return { rowIndex: i + 2, result: r };
    });
  }, [dataRows, map, mappingComplete]);

  const fullValidation = useMemo(() => {
    if (!mappingComplete) return { valid: false as const, entries: [] as CsvImportEntry[], errors: [] as string[] };
    const entries: CsvImportEntry[] = [];
    const errors: string[] = [];
    dataRows.forEach((row, i) => {
      const r = validateRow(row, map, i + 2);
      if (!r.ok) errors.push(...r.errors);
      else entries.push(r.data);
    });
    return {
      valid: errors.length === 0,
      entries,
      errors,
    };
  }, [dataRows, map, mappingComplete]);

  const importRows = useCallback(() => {
    setMessage(null);
    if (!fullValidation.valid || fullValidation.entries.length === 0) {
      setMessage("Fix validation errors before importing.");
      return;
    }
    startTransition(async () => {
      const res = await importTimeEntriesAction({
        entries: fullValidation.entries,
      });
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setMessage(`Imported ${res.data.inserted} entries.`);
      setRawRows(null);
      setMap({});
    });
  }, [fullValidation.entries, fullValidation.valid]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import time entries (CSV)</CardTitle>
        <CardDescription>
          Map columns to fields, preview rows, then import. Project names must
          match existing projects (case-insensitive).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="csv-file">CSV file</Label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {projectNames.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Create at least one project before importing.
          </p>
        ) : null}

        {rawRows ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1">
                  <Label className="text-xs">
                    {f.label}
                    {f.required ? " *" : ""}
                  </Label>
                  <Select
                    value={map[f.key] !== undefined ? String(map[f.key]) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMap((prev) => {
                        const next = { ...prev };
                        if (v === "") delete next[f.key];
                        else next[f.key] = Number.parseInt(v, 10);
                        return next;
                      });
                    }}
                    className="h-9 text-sm"
                  >
                    <option value="">
                      {f.required ? "Select column…" : "— Skip —"}
                    </option>
                    {headers.map((h, i) => (
                      <option key={i} value={String(i)}>
                        {h.trim() || `Column ${i + 1}`}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {!mappingComplete ? (
              <p className="text-sm text-zinc-500">
                Map date, duration, and project columns to continue.
              </p>
            ) : (
              <>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Preview</h4>
                  <div className="max-h-56 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                          <th className="px-2 py-1.5">#</th>
                          <th className="px-2 py-1.5">Status</th>
                          <th className="px-2 py-1.5">Date</th>
                          <th className="px-2 py-1.5">Hrs</th>
                          <th className="px-2 py-1.5">Project</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {preview.map((p) => (
                          <tr key={p.rowIndex}>
                            <td className="px-2 py-1 tabular-nums">{p.rowIndex}</td>
                            <td
                              className={cn(
                                "px-2 py-1",
                                p.result.ok
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400",
                              )}
                            >
                              {p.result.ok ? "OK" : "Error"}
                            </td>
                            <td className="px-2 py-1">
                              {p.result.ok
                                ? p.result.data.date
                                : "—"}
                            </td>
                            <td className="px-2 py-1">
                              {p.result.ok
                                ? p.result.data.duration_hours
                                : "—"}
                            </td>
                            <td className="max-w-[8rem] truncate px-2 py-1">
                              {p.result.ok
                                ? p.result.data.projectName
                                : p.result.errors[0]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {dataRows.length} row{dataRows.length === 1 ? "" : "s"} ·{" "}
                    {fullValidation.valid ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        all valid
                      </span>
                    ) : (
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {fullValidation.errors.length} issue(s)
                      </span>
                    )}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !fullValidation.valid ||
                      pending ||
                      projectNames.length === 0
                    }
                    onClick={importRows}
                  >
                    {pending ? "Importing…" : "Import all valid rows"}
                  </Button>
                </div>

                {!fullValidation.valid && fullValidation.errors.length > 0 ? (
                  <ul className="max-h-32 list-inside list-disc overflow-auto text-xs text-red-600 dark:text-red-400">
                    {fullValidation.errors.slice(0, 20).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {fullValidation.errors.length > 20 ? (
                      <li>…and more</li>
                    ) : null}
                  </ul>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {message ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
