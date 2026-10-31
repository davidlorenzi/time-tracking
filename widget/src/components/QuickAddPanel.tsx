import { useEffect, useState } from "react";

import { localISODate } from "../lib/dates";
import {
  createTimeEntry,
  fetchActiveProjects,
  type ActiveProject,
} from "../lib/queries";
import { NewProjectForm } from "./NewProjectForm";

type QuickAddPanelProps = {
  onAdded: () => void;
};

const controlClass =
  "h-9 rounded-md border border-[var(--control-border)] bg-[var(--control-bg)] text-sm outline-none transition-colors focus:border-zinc-400 disabled:opacity-50";

export function QuickAddPanel({ onAdded }: QuickAddPanelProps) {
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("1");
  const [date, setDate] = useState(localISODate());
  const [billable, setBillable] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  function loadProjects(selectId?: string) {
    fetchActiveProjects()
      .then((data) => {
        setProjects(data);
        const picked = selectId
          ? data.find((p) => p.id === selectId)
          : data[0];
        if (picked) {
          setProjectId(picked.id);
          setBillable(picked.default_billable);
        }
      })
      .catch((err) => setMessage(err.message));
  }

  function onProjectChange(id: string) {
    setProjectId(id);
    const project = projects.find((p) => p.id === id);
    if (project) setBillable(project.default_billable);
  }

  function onProjectCreated(project: ActiveProject) {
    setShowNewProject(false);
    loadProjects(project.id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const hours = Number.parseFloat(duration.replace(",", "."));
    if (!projectId || Number.isNaN(hours) || hours <= 0) {
      setMessage("Pick a project and a valid duration.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      await createTimeEntry({
        date,
        duration_hours: hours,
        description,
        project_id: projectId,
        billable,
      });
      setDescription("");
      setMessage("Added.");
      onAdded();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add entry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--subtle)]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
            />
          </svg>
          <select
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            disabled={projects.length === 0 || pending}
            className={`${controlClass} w-full appearance-none pl-7 pr-7`}
          >
            {projects.length === 0 ? <option>No active projects</option> : null}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--subtle)]"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <button
          type="button"
          onClick={() => setShowNewProject((v) => !v)}
          aria-pressed={showNewProject}
          className={`${controlClass} flex items-center gap-1 whitespace-nowrap px-2 font-medium ${
            showNewProject
              ? "border-zinc-400 text-[var(--foreground)]"
              : "text-[var(--subtle)] hover:text-[var(--foreground)]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-3 w-3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Project
        </button>
      </div>

      {showNewProject ? (
        <NewProjectForm
          onCreated={onProjectCreated}
          onCancel={() => setShowNewProject(false)}
        />
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
          disabled={pending}
          rows={2}
          className={`${controlClass} h-16 resize-none py-2 px-2 leading-snug placeholder:text-[var(--subtle)]`}
        />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={pending}
            className={`${controlClass} flex-1 px-2`}
          />
          <input
            type="text"
            inputMode="decimal"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={pending}
            aria-label="Duration in hours"
            className={`${controlClass} w-16 px-2 text-center tabular-nums`}
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--subtle)]">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            disabled={pending}
          />
          Billable
        </label>

        <button
          type="submit"
          disabled={pending || projects.length === 0}
          className="h-9 rounded-md bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Adding…" : "Add entry"}
        </button>

        {message ? (
          <p className="text-xs text-[var(--subtle)]">{message}</p>
        ) : null}
      </form>
    </div>
  );
}
