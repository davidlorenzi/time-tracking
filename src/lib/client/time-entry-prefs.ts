const LAST_PROJECT = "time:lastProjectId";
const LAST_DURATION = "time:lastDuration";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function getLastProjectId(): string | null {
  return storage()?.getItem(LAST_PROJECT) ?? null;
}

export function setLastProjectId(id: string): void {
  storage()?.setItem(LAST_PROJECT, id);
}

export function getLastDurationHours(): string {
  const v = storage()?.getItem(LAST_DURATION);
  if (v && v.trim() !== "" && !Number.isNaN(Number.parseFloat(v))) return v;
  return "1";
}

export function setLastDurationHours(value: string): void {
  storage()?.setItem(LAST_DURATION, value);
}
