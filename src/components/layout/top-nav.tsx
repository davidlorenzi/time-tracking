import Link from "next/link";

import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from "@/lib/nav";

import { navIconForIndex, secondaryIconForHref } from "./nav-icons";
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
        <nav className="flex items-center gap-1" aria-label="Secondary">
          {SECONDARY_NAV_ITEMS.map((item) => {
            const Icon = secondaryIconForHref(item.href);
            return (
              <NavLink
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="flex h-10 items-center gap-2 px-2.5 text-sm font-medium md:px-3"
              >
                <Icon className="h-5 w-5 opacity-70 md:h-4 md:w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
