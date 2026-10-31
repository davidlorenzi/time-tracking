"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; message: string; kind: ToastKind };
type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type Ctx = {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ToastContext = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const nextId = useRef(1);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setDialog({ ...options, resolve })),
    [],
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  function close(result: boolean) {
    dialog?.resolve(result);
    setDialog(null);
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto max-w-sm rounded-lg px-4 py-2 text-sm text-white shadow-lg",
              t.kind === "error" && "bg-red-600",
              t.kind === "success" && "bg-emerald-600",
              t.kind === "info" && "bg-zinc-800",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
      {dialog ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-label={dialog.title} className="w-full max-w-sm rounded-xl bg-background p-5 shadow-2xl">
            <h2 className="text-base font-semibold">{dialog.title}</h2>
            {dialog.message ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dialog.message}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
              <Button variant={dialog.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
                {dialog.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
