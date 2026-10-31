# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal time-tracking app. Two separate apps share one Supabase (Postgres) backend:

- **Web app** (repo root): Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + Zod.
- **Desktop widget** (`widget/`): Tauri 2 + Vite + React, a small quick-add/summary panel. It has its own `package.json` and `node_modules`, and talks to Supabase directly from the client (no Next.js involved). Excluded from the root ESLint/TS config.

Data model: `clients` → `projects` → `time_entries`, plus a single-row `app_settings` table (calendar colors, billable threshold, work days, extra holidays; defaults in `src/lib/settings-defaults.ts`). Revenue is derived, not stored, and computed in `src/lib/data/summaries.ts`: hourly projects use `(client daily_rate / 8) * hours` (`src/lib/data/revenue.ts`); `projects.billing_type` `fixed_budget` accrues `flat_amount / budget_hours` per billable hour up to the budget, `fixed_monthly` books `flat_amount` once per month, on the date of the project's last billable entry that month. The widget mirrors all three in `widget/src/lib/revenue.ts` (`computeRevenue`, fed by `fetchSummary` in `widget/src/lib/queries.ts`); keep it in sync with `buildSummary` in `summaries.ts`. Postgres `numeric` can arrive as a string, so use `toNumber`.

## Commands

Web app (repo root):

```bash
npm run dev     # next dev --turbopack
npm run build
npm run lint    # eslint
npx tsc --noEmit
```

Widget (run inside `widget/`):

```bash
npm run dev          # vite only
npm run tauri dev    # full desktop app
npm run build        # tsc && vite build
```

There is no test suite. Schema changes live in `supabase/migrations/NNN_*.sql` and must be applied manually in Supabase (there is no migration runner in the repo).

Env: copy `.env.example` → `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The widget needs `widget/.env` with the same values under `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Web app architecture

Layered, with a consistent flow for every entity (clients, projects, time-entries, summaries, import-export):

1. **`src/app/(app)/*/page.tsx`**: RSC pages fetch data via `src/lib/data/*` and pass it to client components in `src/components/*`.
2. **`src/actions/*.ts`**: Server Actions (`"use server"`). Each one validates input with `parseActionInput(zodSchema, input)` (`src/lib/validation/*`), creates a server Supabase client, calls the repository, and on success calls `revalidateAppData()`.
3. **`src/lib/data/*.ts`**: repository layer taking a Supabase client; returns `ActionResult<T>` (`{ok:true,data} | {ok:false,error}` from `src/lib/types/actions.ts`) rather than throwing. Postgres errors are mapped in `postgrest-error.ts`.
4. **Client refresh**: after a mutation, client components call `router.refresh()` and `dispatchAppDataRefresh()` (`src/lib/app-events.ts`) so client-fetched dashboard summaries refetch.

Other notes:
- Auth session refresh happens in root `middleware.ts` → `src/lib/supabase/middleware.ts`; use `src/lib/supabase/server.ts` in actions/RSC and `client.ts` in the browser.
- Path alias `@/*` → `src/*`.
- UI is custom (no component library): primitives in `src/components/ui/`, mobile bottom nav + desktop top nav in `src/components/layout/`. Tables have separate mobile card (`md:hidden`) and desktop layouts.
- Only `Active` projects are offered in the quick-add bar; new entries inherit the project's `default_billable`.
- Calendar (`/calendar`): `src/components/calendar/*`; day type (workday/weekend/holiday, Italian holidays computed in `src/lib/holidays.ts`) and threshold state come from `src/lib/calendar-days.ts`. The day side panel reuses `EntryCard`/`useEntryEdit` from `src/components/time/entry-edit.tsx`, shared with the time-entries table.
- Overlays: `Sheet` (right drawer on desktop, bottom sheet on mobile) and `useToast()` (`toast`, promise-based `confirm`) from `src/components/ui/`; use them instead of `alert`/`confirm`.
- CSV import/export: `src/lib/csv*.ts`, `src/lib/validation/csv-import.ts`, `src/actions/import-export.ts`.

## Widget notes

Queries are in `widget/src/lib/queries.ts` (direct supabase-js calls that throw on error, unlike the web app's `ActionResult` style). Native window behavior (positioning, tray, etc.) is in `widget/src-tauri/src/lib.rs`, with permissions in `widget/src-tauri/capabilities/default.json`. If you change shared schema or revenue logic, update both apps.
