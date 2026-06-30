import { useEffect, useState } from "react";

import { localISODate } from "../lib/dates";
import {
  createTimeEntry,
  fetchActiveProjects,
  type ActiveProject,
} from "../lib/queries";

type QuickAddPanelProps = {
  onAdded: () => void;
};

export function QuickAddPanel({ onAdded }: QuickAddPanelProps) {
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("1");
  const [date, setDate] = useState(localISODate());
  const [billable, setBillable] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveProjects()
      .then((data) => {
        setProjects(data);
        if (data.length > 0) {
          setProjectId(data[0].id);
          setBillable(data[0].default_billable);
        }
      })
      .catch((err) => setMessage(err.message));
  }, []);

  function onProjectChange(id: string) {
    setProjectId(id);
    const project = projects.find((p) => p.id === id);
    if (project) setBillable(project.default_billable);
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
    <form onSubmit={submit} className="flex flex-col gap-2 p-3">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
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
          className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-7 pr-7 text-sm outline-none transition-colors focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
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
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What did you work on?"
        disabled={pending}
        className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:placeholder:text-zinc-500"
      />

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={pending}
          className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none transition-colors focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <input
          type="text"
          inputMode="decimal"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={pending}
          aria-label="Duration in hours"
          className="h-9 w-16 rounded-lg border border-zinc-200 bg-white px-2 text-center text-sm tabular-nums outline-none transition-colors focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
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
        className="h-9 rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Adding…" : "Add entry"}
      </button>

      {message ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
      ) : null}
    </form>
  );
}
