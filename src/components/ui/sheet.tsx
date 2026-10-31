"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional element shown at the left of the header (e.g. a back button). */
  headerLead?: ReactNode;
  className?: string;
};

/** Right drawer on desktop, bottom sheet on mobile. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  headerLead,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col bg-background shadow-2xl outline-none",
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800",
          "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[30rem] md:rounded-none md:border-l md:border-t-0",
          className,
        )}
      >
        <div className="flex items-start gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {headerLead}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
