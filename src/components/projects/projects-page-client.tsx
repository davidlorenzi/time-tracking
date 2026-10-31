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
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
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
import { formatHours, formatMoney } from "@/lib/format";
import type { BillingType, ProjectRow, ProjectStatus } from "@/lib/types/database";
import { cn } from "@/lib/cn";

type ClientOption = { id: string; name: string };

type ProjectsPageClientProps = {
  initialProjects: ProjectRow[];
  clients: ClientOption[];
  listError?: string | null;
};

const BILLING_LABELS: Record<BillingType, string> = {
  hourly: "Hourly (client daily rate)",
  fixed_budget: "Flat rate with hours budget",
  fixed_monthly: "Flat rate per month",
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

function billingSummary(p: ProjectRow): string {
  if (p.billing_type === "fixed_budget") {
    return `${formatMoney(Number(p.flat_amount ?? 0))} · ${formatHours(Number(p.budget_hours ?? 0))}`;
  }
  if (p.billing_type === "fixed_monthly") {
    return `${formatMoney(Number(p.flat_amount ?? 0))}/month`;
  }
  return "Hourly";
}

type FormState = {
  name: string;
  clientId: string;
  status: ProjectStatus;
  description: string;
  defaultBillable: boolean;
  billingType: BillingType;
  flatAmount: string;
  budgetHours: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    clientId: "",
    status: "Active",
    description: "",
    defaultBillable: true,
    billingType: "hourly",
    flatAmount: "",
    budgetHours: "",
  };
}

function formFromProject(p: ProjectRow): FormState {
  return {
    name: p.name,
    clientId: p.client_id,
    status: p.status,
    description: p.description ?? "",
    defaultBillable: p.default_billable,
    billingType: p.billing_type,
    flatAmount: p.flat_amount != null ? String(p.flat_amount) : "",
    budgetHours: p.budget_hours != null ? String(p.budget_hours) : "",
  };
}

export function ProjectsPageClient({
  initialProjects,
  clients,
  listError = null,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  const [sheet, setSheet] = useState<{ mode: "create" } | { mode: "edit"; project: ProjectRow } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const refresh = () => {
    dispatchAppDataRefresh();
    router.refresh();
  };

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setSheet({ mode: "create" });
  };

  const openEdit = (project: ProjectRow) => {
    setForm(formFromProject(project));
    setFormError(null);
    setSheet({ mode: "edit", project });
  };

  const submit = () => {
    setFormError(null);
    const flat = form.billingType === "hourly" ? null : form.flatAmount.trim().replace(",", ".");
    const budget = form.billingType === "fixed_budget" ? form.budgetHours.trim().replace(",", ".") : null;
    if (form.billingType !== "hourly" && !flat) return setFormError("Flat amount is required.");
    if (form.billingType === "fixed_budget" && !budget) return setFormError("Budget hours are required.");

    const common = {
      name: form.name,
      client_id: form.clientId,
      status: form.status,
      default_billable: form.defaultBillable,
      billing_type: form.billingType,
      flat_amount: flat,
      budget_hours: budget,
    };

    startTransition(async () => {
      const res =
        sheet?.mode === "edit"
          ? await updateProjectAction({
              id: sheet.project.id,
              ...common,
              description: form.description.trim() === "" ? null : form.description.trim(),
            })
          : await createProjectAction({
              ...common,
              description: form.description.trim() === "" ? undefined : form.description.trim(),
            });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      toast(sheet?.mode === "edit" ? "Project updated" : "Project created", "success");
      setSheet(null);
      refresh();
    });
  };

  const toggleStatus = (project: ProjectRow) => {
    const next: ProjectStatus = project.status === "Active" ? "On Hold" : "Active";
    startTransition(async () => {
      const res = await updateProjectAction({ id: project.id, status: next });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      refresh();
    });
  };

  const remove = async (project: ProjectRow) => {
    const ok = await confirm({
      title: `Delete “${project.name}”?`,
      message: "Remove its time entries first, if any.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteProjectAction({ id: project.id });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Project deleted", "success");
      refresh();
    });
  };

  const rowActions = (p: ProjectRow) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="secondary" size="sm" className="h-9" disabled={pending} onClick={() => openEdit(p)}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-zinc-500" disabled={pending} onClick={() => toggleStatus(p)}>
        {p.status === "Active" ? "Deactivate" : "Activate"}
      </Button>
      <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-red-600 dark:text-red-400" disabled={pending} onClick={() => void remove(p)}>
        Delete
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Work streams linked to a client, with hourly or flat-rate billing."
        actions={
          <Button onClick={openCreate}>Add project</Button>
        }
      />

      {listError ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">{listError}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {initialProjects.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No projects. Add a client, then click &quot;Add project&quot;.
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 md:hidden">
                {initialProjects.map((p) => (
                  <li key={p.id} className={cn("space-y-2 p-4", p.status !== "Active" && "opacity-60")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-sm text-zinc-500">{clientNameById[p.client_id] ?? "—"}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    {p.description ? <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{p.description}</p> : null}
                    <p className="text-xs text-zinc-500">
                      {billingSummary(p)} · {p.default_billable ? "billable by default" : "non-billable by default"}
                    </p>
                    {rowActions(p)}
                  </li>
                ))}
              </ul>
              {/* Desktop table */}
              <div className="hidden md:block">
                <TableWrap className="sm:rounded-none sm:border-0">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableTh>Name</TableTh>
                        <TableTh>Client</TableTh>
                        <TableTh>Status</TableTh>
                        <TableTh>Billing</TableTh>
                        <TableTh>Billable</TableTh>
                        <TableTh className="text-right"> </TableTh>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {initialProjects.map((p) => (
                        <TableRow key={p.id} className={cn(p.status !== "Active" && "opacity-50")}>
                          <TableTd>
                            <p className="font-medium">{p.name}</p>
                            {p.description ? <p className="max-w-xs truncate text-xs text-zinc-500">{p.description}</p> : null}
                          </TableTd>
                          <TableTd>{clientNameById[p.client_id] ?? "—"}</TableTd>
                          <TableTd><StatusBadge status={p.status} /></TableTd>
                          <TableTd className="whitespace-nowrap text-xs">{billingSummary(p)}</TableTd>
                          <TableTd>
                            <span className={cn("text-xs font-medium", p.default_billable ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")}>
                              {p.default_billable ? "Yes" : "No"}
                            </span>
                          </TableTd>
                          <TableTd className="text-right">{rowActions(p)}</TableTd>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableWrap>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet?.mode === "edit" ? "Edit project" : "Add project"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField id="pr-name" label="Name">
            <Input id="pr-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Project name" disabled={pending} required />
          </FormField>
          <FormField id="pr-client" label="Client">
            <Select id="pr-client" value={form.clientId} onChange={(e) => set("clientId", e.target.value)} disabled={pending || clients.length === 0} required>
              <option value="" disabled>{clients.length === 0 ? "Create a client first" : "Select client"}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField id="pr-status" label="Status">
            <Select id="pr-status" value={form.status} onChange={(e) => set("status", e.target.value as ProjectStatus)} disabled={pending}>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On hold</option>
            </Select>
          </FormField>
          <FormField id="pr-desc" label="Description">
            <Textarea id="pr-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional" disabled={pending} />
          </FormField>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={form.defaultBillable} onChange={(e) => set("defaultBillable", e.target.checked)} disabled={pending} className="h-5 w-5 rounded border-zinc-300 accent-emerald-600" />
            Billable by default
          </label>

          <FormField id="pr-billing" label="Billing type">
            <Select id="pr-billing" value={form.billingType} onChange={(e) => set("billingType", e.target.value as BillingType)} disabled={pending}>
              {(Object.keys(BILLING_LABELS) as BillingType[]).map((k) => (
                <option key={k} value={k}>{BILLING_LABELS[k]}</option>
              ))}
            </Select>
          </FormField>
          {form.billingType !== "hourly" ? (
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="pr-flat"
                label={form.billingType === "fixed_monthly" ? "Amount per month (€)" : "Total amount (€)"}
              >
                <Input id="pr-flat" type="number" inputMode="decimal" min={0} step={0.01} value={form.flatAmount} onChange={(e) => set("flatAmount", e.target.value)} disabled={pending} />
              </FormField>
              {form.billingType === "fixed_budget" ? (
                <FormField id="pr-budget" label="Budget hours">
                  <Input id="pr-budget" type="number" inputMode="decimal" min={0} step={0.25} value={form.budgetHours} onChange={(e) => set("budgetHours", e.target.value)} disabled={pending} />
                </FormField>
              ) : null}
              <p className="col-span-2 text-xs text-zinc-500">
                {form.billingType === "fixed_budget"
                  ? "Revenue accrues pro-rata (amount ÷ budget hours per billable hour) until the budget is used up."
                  : "The monthly amount counts once for each month with billable entries, on the last billable day of the month."}
              </p>
            </div>
          ) : null}

          {formError ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{formError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={pending} onClick={() => setSheet(null)}>Cancel</Button>
            <Button type="submit" disabled={pending || !form.clientId || !form.name.trim()}>
              {pending ? "Saving…" : sheet?.mode === "edit" ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
