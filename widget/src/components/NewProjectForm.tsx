import { useEffect, useState } from "react";

import {
  createClient,
  createProject,
  fetchClients,
  type ActiveProject,
  type ClientOption,
} from "../lib/queries";

type NewProjectFormProps = {
  onCreated: (project: ActiveProject) => void;
  onCancel: () => void;
};

const inputClass =
  "h-9 w-full rounded-md border border-[var(--control-border)] bg-[var(--control-bg)] px-2 text-sm outline-none transition-colors placeholder:text-[var(--subtle)] focus:border-zinc-400 disabled:opacity-50";

export function NewProjectForm({ onCreated, onCancel }: NewProjectFormProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientRate, setNewClientRate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [defaultBillable, setDefaultBillable] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients()
      .then((data) => {
        setClients(data);
        if (data.length === 0) setCreatingClient(true);
        else setClientId(data[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      let resolvedClientId = clientId;
      if (creatingClient) {
        const rate = Number.parseFloat(newClientRate.replace(",", "."));
        if (!newClientName.trim() || Number.isNaN(rate) || rate < 0) {
          throw new Error("Pick a client name and a valid daily rate.");
        }
        const client = await createClient({
          name: newClientName.trim(),
          daily_rate: rate,
        });
        resolvedClientId = client.id;
      }
      if (!resolvedClientId) {
        throw new Error("Pick a client.");
      }
      const project = await createProject({
        name: projectName.trim(),
        client_id: resolvedClientId,
        default_billable: defaultBillable,
      });
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--control-bg)] p-2"
    >
      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="New project name"
        disabled={pending}
        className={inputClass}
        autoFocus
      />

      {creatingClient ? (
        <div className="flex gap-2">
          <input
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="Client name"
            disabled={pending}
            className={inputClass}
          />
          <input
            value={newClientRate}
            onChange={(e) => setNewClientRate(e.target.value)}
            placeholder="Daily rate"
            inputMode="decimal"
            disabled={pending}
            className={`${inputClass} w-24`}
          />
        </div>
      ) : (
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={pending}
          className={inputClass}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {clients.length > 0 ? (
        <button
          type="button"
          onClick={() => setCreatingClient((v) => !v)}
          className="self-start text-xs text-[var(--subtle)] underline-offset-2 hover:underline"
        >
          {creatingClient ? "Pick an existing client instead" : "+ New client"}
        </button>
      ) : null}

      <label className="flex items-center gap-2 text-xs text-[var(--subtle)]">
        <input
          type="checkbox"
          checked={defaultBillable}
          onChange={(e) => setDefaultBillable(e.target.checked)}
          disabled={pending}
        />
        Billable by default
      </label>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-8 flex-1 rounded-md bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating…" : "Create project"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="h-8 rounded-md px-2 text-sm text-[var(--subtle)] transition-colors hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
