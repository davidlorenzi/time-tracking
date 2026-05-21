"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/actions/projects";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  TableWrap,
} from "@/components/ui/table";
import { dispatchAppDataRefresh } from "@/lib/app-events";
import type { ProjectRow, ProjectStatus } from "@/lib/types/database";
import { cn } from "@/lib/cn";

function IconTrash() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

type ClientOption = { id: string; name: string };

type ProjectsPageClientProps = {
  initialProjects: ProjectRow[];
  clients: ClientOption[];
  listError?: string | null;
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "Active"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
      )}
    >
      {status}
    </span>
  );
}

export function ProjectsPageClient({
  initialProjects,
  clients,
  listError = null,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const clientNameById = Object.fromEntries(
    clients.map((c) => [c.id, c.name]),
  );

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Active");
  const [description, setDescription] = useState("");
  const [defaultBillable, setDefaultBillable] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    dispatchAppDataRefresh();
    router.refresh();
  };

  const submitCreate = () => {
    setFormError(null);
    startTransition(async () => {
      const res = await createProjectAction({
        name,
        client_id: clientId,
        status,
        description: description.trim() === "" ? undefined : description.trim(),
        default_billable: defaultBillable,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setName("");
      setClientId("");
      setStatus("Active");
      setDescription("");
      setDefaultBillable(true);
      setShowAdd(false);
      refresh();
    });
  };

  const toggleStatus = (project: ProjectRow) => {
    const next: ProjectStatus = project.status === "Active" ? "On Hold" : "Active";
    startTransition(async () => {
      const res = await updateProjectAction({ id: project.id, status: next });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this project? Remove time entries first if any."))
      return;
    startTransition(async () => {
      const res = await deleteProjectAction({ id });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Work streams linked to a client and status."
        actions={
          <Button type="button" size="sm" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Close form" : "Add project"}
          </Button>
        }
      />

      {listError ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="space-y-6">
        <Card className={cn("max-w-xl", !showAdd && "hidden")}>
          <CardHeader>
            <CardTitle>Add project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField id="pr-name" label="Name">
              <Input
                id="pr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                disabled={pending}
              />
            </FormField>
            <FormField id="pr-client" label="Client">
              <Select
                id="pr-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={pending || clients.length === 0}
                className="w-full"
              >
                <option value="" disabled>
                  {clients.length === 0 ? "Create a client first" : "Select client"}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="pr-status" label="Status">
              <Select
                id="pr-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                disabled={pending}
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On hold</option>
              </Select>
            </FormField>
            <FormField id="pr-desc" label="Description">
              <Textarea
                id="pr-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                disabled={pending}
              />
            </FormField>
            <div className="flex items-center gap-2">
              <input
                id="pr-billable"
                type="checkbox"
                checked={defaultBillable}
                onChange={(e) => setDefaultBillable(e.target.checked)}
                disabled={pending}
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
              />
              <label
                htmlFor="pr-billable"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Billable by default
              </label>
            </div>
            {formError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending || !clientId}
                onClick={submitCreate}
              >
                {pending ? "Saving…" : "Create project"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All projects</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            <TableWrap>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableTh>Name</TableTh>
                    <TableTh>Client</TableTh>
                    <TableTh>Status</TableTh>
                    <TableTh>Billable</TableTh>
                    <TableTh className="text-right"> </TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {initialProjects.length === 0 ? (
                    <TableRow>
                      <TableTd
                        colSpan={5}
                        className="py-12 text-center text-sm text-zinc-500"
                      >
                        No projects. Add a client, then click &quot;Add project&quot;.
                      </TableTd>
                    </TableRow>
                  ) : (
                    initialProjects.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn(
                          p.status !== "Active" && "opacity-50",
                        )}
                      >
                        <TableTd className="font-medium">{p.name}</TableTd>
                        <TableTd>{clientNameById[p.client_id] ?? "—"}</TableTd>
                        <TableTd>
                          <StatusBadge status={p.status} />
                        </TableTd>
                        <TableTd>
                          <span
                            className={cn(
                              "text-xs font-medium",
                              p.default_billable
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-zinc-400 dark:text-zinc-500",
                            )}
                          >
                            {p.default_billable ? "Yes" : "No"}
                          </span>
                        </TableTd>
                        <TableTd className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                              disabled={pending}
                              onClick={() => toggleStatus(p)}
                            >
                              {p.status === "Active" ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                              disabled={pending}
                              onClick={() => remove(p.id)}
                              aria-label="Delete project"
                            >
                              <IconTrash />
                            </Button>
                          </div>
                        </TableTd>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
