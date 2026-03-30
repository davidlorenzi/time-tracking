import { localISODate } from "@/lib/dates";

/** Prefer YYYY-MM-DD; accept parseable dates and simple DD/MM/YYYY vs MM/DD when unambiguous. */
export function parseFlexibleDate(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const ts = Date.parse(t);
  if (!Number.isNaN(ts)) {
    return localISODate(new Date(ts));
  }

  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);
  if (a > 12) {
    return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }
  if (b > 12) {
    return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }
  return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
}

export function parseBooleanLoose(raw: string): boolean | null {
  const x = raw.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(x)) return true;
  if (["0", "false", "no", "n", "off"].includes(x)) return false;
  if (x === "") return null;
  return null;
}

export function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
