import Link from "next/link";

import { NAV_ITEMS } from "@/lib/nav";

import { navIconForIndex } from "./nav-icons";
import { NavLink } from "./nav-link";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-background/90 backdrop-blur-md dark:border-zinc-800/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/dashboard"
          className="shrink-0 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Time
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main"
        >
          {NAV_ITEMS.map((item, i) => {
            const Icon = navIconForIndex(i);
            return (
              <NavLink
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium"
              >
                <Icon className="h-4 w-4 opacity-70" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
