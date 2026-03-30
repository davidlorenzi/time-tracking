import type { ReactNode } from "react";

import {
  QuickAddTimeBar,
  type QuickAddProjectOption,
} from "@/components/time/quick-add-time-bar";

import { BottomNav } from "./bottom-nav";
import { TopNav } from "./top-nav";

type AppShellProps = {
  children: ReactNode;
  projects: QuickAddProjectOption[];
};

export function AppShell({ children, projects }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Skip to content
      </a>
      <TopNav />
      <QuickAddTimeBar projects={projects} />
      <div className="flex flex-1 flex-col">
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
