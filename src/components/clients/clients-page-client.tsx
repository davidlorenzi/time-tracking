"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createClientAction, deleteClientAction } from "@/actions/clients";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
import type { ClientRow } from "@/lib/types/database";
import { cn } from "@/lib/cn";

type ClientsPageClientProps = {
  initialClients: ClientRow[];
  listError?: string | null;
};

export function ClientsPageClient({
  initialClients,
  listError = null,
}: ClientsPageClientProps) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    dispatchAppDataRefresh();
    router.refresh();
  };

  const submitCreate = () => {
    setFormError(null);
    startTransition(async () => {
      const res = await createClientAction({
        name,
        daily_rate: dailyRate === "" ? 0 : Number.parseFloat(dailyRate),
        notes: notes.trim() === "" ? undefined : notes.trim(),
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setName("");
      setDailyRate("");
      setNotes("");
      setShowAdd(false);
      refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this client? Projects must be removed first.")) return;
    startTransition(async () => {
      const res = await deleteClientAction({ id });
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
        title="Clients"
        description="Billing entities and default daily rates."
        actions={
          <Button type="button" size="sm" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Close form" : "Add client"}
          </Button>
        }
      />

      {listError ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="space-y-6">
        <Card
          className={cn(
            "max-w-xl transition-all",
            !showAdd && "hidden",
          )}
        >
          <CardHeader>
            <CardTitle>Add client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField id="cl-name" label="Name">
              <Input
                id="cl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company or person"
                disabled={pending}
              />
            </FormField>
            <FormField
              id="cl-rate"
              label="Daily rate"
              hint="Used for revenue estimates (÷ 8 × hours)."
            >
              <Input
                id="cl-rate"
                type="number"
                min={0}
                step={0.01}
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="800"
                disabled={pending}
              />
            </FormField>
            <FormField id="cl-notes" label="Notes" hint="Optional internal notes.">
              <Textarea
                id="cl-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, contacts…"
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
                disabled={pending}
                onClick={submitCreate}
              >
                {pending ? "Saving…" : "Create client"}
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
            <CardTitle>Directory</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            <TableWrap>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableTh>Name</TableTh>
                    <TableTh className="text-right">Daily rate</TableTh>
                    <TableTh className="hidden sm:table-cell">Notes</TableTh>
                    <TableTh className="w-24 text-right"> </TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {initialClients.length === 0 ? (
                    <TableRow>
                      <TableTd
                        colSpan={4}
                        className="py-12 text-center text-sm text-zinc-500"
                      >
                        No clients yet. Click &quot;Add client&quot; to create one.
                      </TableTd>
                    </TableRow>
                  ) : (
                    initialClients.map((c) => (
                      <TableRow key={c.id}>
                        <TableTd className="font-medium">{c.name}</TableTd>
                        <TableTd className="text-right tabular-nums">
                          {Number(c.daily_rate).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </TableTd>
                        <TableTd className="hidden max-w-xs truncate text-zinc-600 sm:table-cell dark:text-zinc-400">
                          {c.notes ?? "—"}
                        </TableTd>
                        <TableTd className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                            disabled={pending}
                            onClick={() => remove(c.id)}
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
