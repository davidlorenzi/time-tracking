import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function TableWrap({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-zinc-200 dark:sm:border-zinc-800",
        className,
      )}
      {...props}
    />
  );
}

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full min-w-[32rem] border-collapse text-left text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-zinc-100 dark:divide-zinc-800", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "bg-white transition-colors hover:bg-zinc-50/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/40",
        className,
      )}
      {...props}
    />
  );
}

export function TableTh({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 font-medium text-zinc-600 first:pl-4 last:pr-4 dark:text-zinc-400 sm:first:pl-4 sm:last:pr-4",
        className,
      )}
      {...props}
    />
  );
}

export function TableTd({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-zinc-900 first:pl-4 last:pr-4 dark:text-zinc-100 sm:first:pl-4 sm:last:pr-4",
        className,
      )}
      {...props}
    />
  );
}
