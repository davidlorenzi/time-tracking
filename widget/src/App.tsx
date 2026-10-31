import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

import { HoursChart } from "./components/HoursChart";
import { QuickAddPanel } from "./components/QuickAddPanel";
import { SummaryPanel } from "./components/SummaryPanel";

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "http://localhost:3000";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<"summary" | "week">("summary");

  return (
    <main className="flex h-screen flex-col">
      <header
        data-tauri-drag-region
        className="flex items-center justify-between px-4 pb-1 pt-3"
      >
        <h1 className="text-base font-semibold">Time</h1>
        <button
          type="button"
          onClick={() => openUrl(APP_URL)}
          className="flex items-center gap-1 text-sm text-[var(--subtle)] transition-colors hover:text-[var(--foreground)]"
        >
          Open dashboard
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3 w-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 5h5v5M19 5l-7 7M9 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-3"
            />
          </svg>
        </button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-[var(--divider)]">
        <QuickAddPanel onAdded={() => setRefreshKey((k) => k + 1)} />
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between px-3 pt-3">
            <div className="flex gap-0.5 rounded-lg bg-[var(--control-bg)] p-0.5">
              {(["summary", "week"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    tab === t
                      ? "bg-white/80 font-medium text-zinc-900 shadow-sm dark:bg-white/20 dark:text-white"
                      : "text-[var(--subtle)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {t === "summary" ? "Summary" : "Last 7 days"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              aria-label="Refresh"
              className="rounded-md p-1.5 text-[var(--subtle)] transition-colors hover:bg-[var(--control-bg)] hover:text-[var(--foreground)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0114.5-3.5M19.5 15a8 8 0 01-14.5 3.5"
                />
              </svg>
            </button>
          </div>
          {tab === "summary" ? (
            <SummaryPanel refreshKey={refreshKey} />
          ) : (
            <HoursChart refreshKey={refreshKey} />
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
