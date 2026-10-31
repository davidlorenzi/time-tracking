"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
} from "@/actions/clients";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
import { formatMoney } from "@/lib/format";
import type { ClientRow } from "@/lib/types/database";

type ClientsPageClientProps = {
  initialClients: ClientRow[];
  listError?: string | null;
};

export function ClientsPageClient({
  initialClients,
  listError = null,
}: ClientsPageClientProps) {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const [sheet, setSheet] = useState<{ mode: "create" } | { mode: "edit"; client: ClientRow } | null>(null);
  const [name, setName] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    dispatchAppDataRefresh();
    router.refresh();
  };

  const openCreate = () => {
    setName("");
    setDailyRate("");
    setNotes("");
    setFormError(null);
    setSheet({ mode: "create" });
  };

  const openEdit = (client: ClientRow) => {
    setName(client.name);
    setDailyRate(String(client.daily_rate));
    setNotes(client.notes ?? "");
    setFormError(null);
    setSheet({ mode: "edit", client });
  };

  const submit = () => {
    setFormError(null);
    const rate = dailyRate.trim() === "" ? 0 : Number.parseFloat(dailyRate.replace(",", "."));
    if (Number.isNaN(rate) || rate < 0) return setFormError("Daily rate must be zero or positive.");
    startTransition(async () => {
      const res =
        sheet?.mode === "edit"
          ? await updateClientAction({
              id: sheet.client.id,
              name,
              daily_rate: rate,
              notes: notes.trim() === "" ? null : notes.trim(),
            })
          : await createClientAction({
              name,
              daily_rate: rate,
              notes: notes.trim() === "" ? undefined : notes.trim(),
            });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      toast(sheet?.mode === "edit" ? "Client updated" : "Client created", "success");
      setSheet(null);
      refresh();
    });
  };

  const remove = async (client: ClientRow) => {
    const ok = await confirm({
      title: `Delete “${client.name}”?`,
      message: "Projects must be removed first.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteClientAction({ id: client.id });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Client deleted", "success");
      refresh();
    });
  };

  const actions = (c: ClientRow) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="secondary" size="sm" className="h-9" disabled={pending} onClick={() => openEdit(c)}>Edit</Button>
      <Button variant="ghost" size="sm" className="h-9 text-red-600 hover:text-red-700 dark:text-red-400" disabled={pending} onClick={() => void remove(c)}>Delete</Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Clients"
        description="Billing entities and default daily rates."
        actions={<Button onClick={openCreate}>Add client</Button>}
      />

      {listError ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">{listError}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {initialClients.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No clients yet. Click &quot;Add client&quot; to create one.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 md:hidden">
                {initialClients.map((c) => (
                  <li key={c.id} className="space-y-2 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="shrink-0 text-sm tabular-nums">{formatMoney(Number(c.daily_rate))}/day</p>
                    </div>
                    {c.notes ? <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{c.notes}</p> : null}
                    {actions(c)}
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <TableWrap className="sm:rounded-none sm:border-0">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableTh>Name</TableTh>
                        <TableTh className="text-right">Daily rate</TableTh>
                        <TableTh>Notes</TableTh>
                        <TableTh className="text-right"> </TableTh>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {initialClients.map((c) => (
                        <TableRow key={c.id}>
                          <TableTd className="font-medium">{c.name}</TableTd>
                          <TableTd className="text-right tabular-nums">{formatMoney(Number(c.daily_rate))}</TableTd>
                          <TableTd className="max-w-xs truncate text-zinc-600 dark:text-zinc-400">{c.notes ?? "—"}</TableTd>
                          <TableTd className="text-right">{actions(c)}</TableTd>
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
        title={sheet?.mode === "edit" ? "Edit client" : "Add client"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormField id="cl-name" label="Name">
            <Input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company or person" disabled={pending} required />
          </FormField>
          <FormField id="cl-rate" label="Daily rate (€)" hint="Used for revenue estimates (÷ 8 × hours) on hourly projects.">
            <Input id="cl-rate" type="number" inputMode="decimal" min={0} step={0.01} value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} placeholder="800" disabled={pending} />
          </FormField>
          <FormField id="cl-notes" label="Notes" hint="Optional internal notes.">
            <Textarea id="cl-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, contacts…" disabled={pending} />
          </FormField>
          {formError ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{formError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={pending} onClick={() => setSheet(null)}>Cancel</Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Saving…" : sheet?.mode === "edit" ? "Save changes" : "Create client"}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
