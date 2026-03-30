"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Match prefix (e.g. parent section) */
  matchPrefix?: boolean;
};

export function NavLink({
  href,
  children,
  className,
  matchPrefix = false,
}: NavLinkProps) {
  const pathname = usePathname();
  const active = matchPrefix
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400",
        active
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200",
        className,
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
