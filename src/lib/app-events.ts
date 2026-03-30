/** Dispatched before `router.refresh()` after mutations so the dashboard can refetch summaries. */
export const APP_DATA_REFRESH_EVENT = "time-tracking:data-refresh";

export function dispatchAppDataRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_DATA_REFRESH_EVENT));
}
