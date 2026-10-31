"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateSettingsAction } from "@/actions/settings";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { dispatchAppDataRefresh } from "@/lib/app-events";
import { cn } from "@/lib/cn";
import { DEFAULT_COLORS, type ResolvedSettings } from "@/lib/settings-defaults";
import type { SettingsColors } from "@/lib/types/database";

const COLOR_LABELS: { key: keyof SettingsColors; label: string; hint: string }[] = [
  { key: "workday", label: "Working day", hint: "Background of regular working days" },
  { key: "weekend", label: "Weekend / non-working day", hint: "Background of days off" },
  { key: "holiday", label: "Holiday", hint: "National (Italy) and extra holidays" },
  { key: "below_threshold", label: "Below threshold", hint: "Billable hours under the threshold" },
  { key: "reached_threshold", label: "Threshold reached", hint: "Billable hours equal to the threshold" },
  { key: "over_threshold", label: "Above threshold", hint: "Billable hours over the threshold" },
];

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

type Props = { initial: ResolvedSettings; loadError: string | null };

export function SettingsForm({ initial, loadError }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [threshold, setThreshold] = useState(String(initial.billableThresholdHours));
  const [colors, setColors] = useState<SettingsColors>(initial.colors);
  const [workDays, setWorkDays] = useState<number[]>(initial.workDays);
  const [holidays, setHolidays] = useState<string[]>(initial.extraHolidays);
  const [newHoliday, setNewHoliday] = useState("");

  function toggleDay(day: number) {
    setWorkDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function addHoliday() {
    if (!newHoliday || holidays.includes(newHoliday)) return;
    setHolidays((prev) => [...prev, newHoliday].sort());
    setNewHoliday("");
  }

  function save() {
    startTransition(async () => {
      const res = await updateSettingsAction({
        billable_threshold_hours: threshold,
        colors,
        extra_holidays: holidays,
        work_days: workDays,
      });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Settings saved", "success");
      dispatchAppDataRefresh();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Calendar colors, billable-hours threshold, working days and holidays."
        actions={
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        }
      />
      {loadError ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" role="alert">
          Could not load saved settings (showing defaults): {loadError}. Make sure migration 003 has been applied.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Billable threshold</CardTitle>
          <CardDescription>Daily billable hours needed to count as a “full” day.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField id="threshold" label="Hours per day" className="max-w-[10rem]">
            <Input id="threshold" type="number" inputMode="decimal" min={0} max={24} step={0.25} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar colors</CardTitle>
          <div className="flex items-center justify-between gap-2">
            <CardDescription>Pick the color used for each day type and threshold state.</CardDescription>
            <Button variant="ghost" size="sm" onClick={() => setColors(DEFAULT_COLORS)}>Reset</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {COLOR_LABELS.map(({ key, label, hint }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                id={`color-${key}`}
                type="color"
                value={colors[key]}
                onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-transparent p-1 dark:border-zinc-700"
                aria-label={label}
              />
              <label htmlFor={`color-${key}`} className="min-w-0 text-sm">
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
              </label>
            </div>
          ))}
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Preview</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {COLOR_LABELS.map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-zinc-200 p-2 text-center text-xs text-zinc-900 dark:border-zinc-700" style={{ backgroundColor: colors[key] }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working days</CardTitle>
          <CardDescription>Days not selected are shown with the weekend color.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const on = workDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.value)}
                className={cn(
                  "h-11 min-w-14 rounded-lg border px-3 text-sm font-medium transition-colors",
                  on
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra holidays</CardTitle>
          <CardDescription>Italian national holidays (incl. Easter Monday) are applied automatically. Add local or personal days off here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} aria-label="Holiday date" className="max-w-[12rem]" />
            <Button variant="secondary" onClick={addHoliday} disabled={!newHoliday}>Add</Button>
          </div>
          {holidays.length === 0 ? (
            <p className="text-sm text-zinc-500">No extra holidays.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {holidays.map((h) => (
                <li key={h} className="flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-1 text-sm dark:bg-zinc-800">
                  {h}
                  <button type="button" aria-label={`Remove ${h}`} onClick={() => setHolidays((p) => p.filter((x) => x !== h))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700">×</button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
