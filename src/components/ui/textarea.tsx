import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full min-w-0 resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:ring-zinc-100/10 dark:focus:border-zinc-500",
        className,
      )}
      {...props}
    />
  );
}
