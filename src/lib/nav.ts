export type NavItem = {
  href: string;
  label: string;
  /** Shorter label for bottom nav */
  short: string;
};

/** Primary items: shown in the bottom nav on mobile (max 5). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "Home" },
  { href: "/calendar", label: "Calendar", short: "Calendar" },
  { href: "/time-entries", label: "Time entries", short: "Time" },
  { href: "/clients", label: "Clients", short: "Clients" },
  { href: "/projects", label: "Projects", short: "Projects" },
];

/** Secondary items: shown as header icons on every screen size. */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/import-export", label: "Import / export", short: "I/O" },
  { href: "/settings", label: "Settings", short: "Settings" },
];
