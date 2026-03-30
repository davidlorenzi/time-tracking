"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { createTimeEntryAction } from "@/actions/time-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { dispatchAppDataRefresh } from "@/lib/app-events";
import {
  getLastDurationHours,
  getLastProjectId,
  setLastDurationHours,
  setLastProjectId,
} from "@/lib/client/time-entry-prefs";
import { localISODate } from "@/lib/dates";

export type QuickAddProjectOption = { id: string; name: string };

type QuickAddTimeBarProps = {
  projects: QuickAddProjectOption[];
};

export function QuickAddTimeBar({ projects }: QuickAddTimeBarProps) {
  const router = useRouter();
  const formId = useId();
  const descId = `${formId}-desc`;
  const projectIdField = `${formId}-project`;
  const durationId = `${formId}-duration`;

  const descRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(getLastDurationHours);
  const [projectOverride, setProjectOverride] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const projectIds = useMemo(
    () => new Set(projects.map((p) => p.id)),
    [projects],
  );

  const autoProjectId = useMemo(() => {
    const last = getLastProjectId();
    if (last && projectIds.has(last)) return last;
    if (projects.length === 1) return projects[0].id;
    return "";
  }, [projects, projectIds]);

  const effectiveOverride =
    projectOverride !== null && projectIds.has(projectOverride)
      ? projectOverride
      : null;
  const projectId = effectiveOverride ?? autoProjectId;

  const submit = useCallback(() => {
    setMessage(null);
    const hours = Number.parseFloat(duration.replace(",", "."));
    if (Number.isNaN(hours) || hours <= 0) {
      setMessage({ type: "err", text: "Duration must be greater than 0." });
      return;
    }

    if (!projectId || !projectIds.has(projectId)) {
      setMessage({ type: "err", text: "Pick a project." });
      return;
    }

    startTransition(async () => {
      const res = await createTimeEntryAction({
        date: localISODate(),
        description: description.trim(),
        duration_hours: hours,
        project_id: projectId,
        billable: true,
        invoiced: false,
        tracked_external: false,
      });

      if (!res.ok) {
        setMessage({ type: "err", text: res.error });
        return;
      }

      setLastProjectId(projectId);
      setLastDurationHours(String(hours));
      setDescription("");
      setMessage({ type: "ok", text: "Saved" });
      window.setTimeout(() => setMessage(null), 2000);
      dispatchAppDataRefresh();
      router.refresh();
      descRef.current?.focus();
    });
  }, [description, duration, projectId, projectIds, router]);

  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  const hasProjects = projects.length > 0;

  return (
    <div
      className={cn(
        "sticky top-14 z-30 border-b border-zinc-200/90 bg-background/95 backdrop-blur-md dark:border-zinc-800/90",
        "-mx-4 px-4 py-2 md:-mx-6 md:px-6",
      )}
    >
      <form
        className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={onFormKeyDown}
        aria-label="Quick add time entry"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={descId} className="sr-only">
            Description
          </label>
          <Input
            ref={descRef}
            id={descId}
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on? ⌘↵ save"
            autoComplete="off"
            disabled={!hasProjects || pending}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <div className="min-w-[8rem] flex-1 sm:max-w-[11rem] sm:flex-initial">
            <label htmlFor={projectIdField} className="sr-only">
              Project
            </label>
            <Select
              id={projectIdField}
              value={projectId}
              onChange={(e) => {
                const v = e.target.value;
                setProjectOverride(v);
                if (v) setLastProjectId(v);
              }}
              disabled={!hasProjects || pending}
              className="h-9 text-sm"
              required
            >
              <option value="" disabled={projects.length > 0}>
                Project…
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-20 shrink-0">
            <label htmlFor={durationId} className="sr-only">
              Hours
            </label>
            <Input
              id={durationId}
              type="text"
              inputMode="decimal"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={() => {
                const h = Number.parseFloat(duration.replace(",", "."));
                if (!Number.isNaN(h) && h > 0) {
                  setLastDurationHours(String(h));
                }
              }}
              disabled={!hasProjects || pending}
              className="h-9 text-center text-sm tabular-nums"
              aria-label="Duration in hours"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!hasProjects || pending}
            className="h-9 shrink-0 px-4"
          >
            {pending ? "…" : "Add"}
          </Button>
        </div>
      </form>

      {message ? (
        <p
          className={cn(
            "mx-auto mt-1 max-w-6xl text-center text-xs sm:text-left",
            message.type === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400",
          )}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      {!hasProjects ? (
        <p className="mx-auto mt-1 max-w-6xl text-center text-xs text-zinc-500 sm:text-left">
          Add a{" "}
          <Link
            href="/projects"
            className="font-medium text-zinc-800 underline underline-offset-2 dark:text-zinc-200"
          >
            project
          </Link>{" "}
          to log time.
        </p>
      ) : null}
    </div>
  );
}
