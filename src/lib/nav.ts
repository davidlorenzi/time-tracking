export type NavItem = {
  href: string;
  label: string;
  /** Shorter label for bottom nav */
  short: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "Home" },
  { href: "/time-entries", label: "Time entries", short: "Time" },
  { href: "/clients", label: "Clients", short: "Clients" },
  { href: "/projects", label: "Projects", short: "Projects" },
  { href: "/import-export", label: "Import / export", short: "I/O" },
];
