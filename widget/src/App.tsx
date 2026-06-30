import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

import { QuickAddPanel } from "./components/QuickAddPanel";
import { SummaryPanel } from "./components/SummaryPanel";

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "http://localhost:3000";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="flex h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h1 className="text-sm font-semibold">Time</h1>
        <button
          type="button"
          onClick={() => openUrl(APP_URL)}
          className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
      <QuickAddPanel onAdded={() => setRefreshKey((k) => k + 1)} />
      <SummaryPanel refreshKey={refreshKey} />
    </main>
  );
}

export default App;
