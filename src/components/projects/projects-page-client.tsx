"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createProjectAction, deleteProjectAction } from "@/actions/projects";
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

type ClientOption = { id: string; name: string };

type ProjectsPageClientProps = {
  initialProjects: ProjectRow[];
  clients: ClientOption[];
  listError?: string | null;
};

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
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setName("");
      setClientId("");
      setStatus("Active");
      setDescription("");
      setShowAdd(false);
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
                    <TableTh className="w-24 text-right"> </TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {initialProjects.length === 0 ? (
                    <TableRow>
                      <TableTd
                        colSpan={4}
                        className="py-12 text-center text-sm text-zinc-500"
                      >
                        No projects. Add a client, then click &quot;Add project&quot;.
                      </TableTd>
                    </TableRow>
                  ) : (
                    initialProjects.map((p) => (
                      <TableRow key={p.id}>
                        <TableTd className="font-medium">{p.name}</TableTd>
                        <TableTd>
                          {clientNameById[p.client_id] ?? "—"}
                        </TableTd>
                        <TableTd>{p.status}</TableTd>
                        <TableTd className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                            disabled={pending}
                            onClick={() => remove(p.id)}
                          >
                            Delete
                          </Button>
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
