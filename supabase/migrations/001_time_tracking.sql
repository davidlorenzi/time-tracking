-- Run in Supabase SQL editor or via Supabase CLI (`supabase db push`).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE project_status AS ENUM ('Active', 'Completed', 'On Hold');

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  daily_rate numeric(12, 2) NOT NULL CHECK (daily_rate >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clients_created_at_idx ON public.clients (created_at DESC);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status project_status NOT NULL DEFAULT 'Active',
  client_id uuid NOT NULL REFERENCES public.clients (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_client_id_idx ON public.projects (client_id);
CREATE INDEX projects_status_idx ON public.projects (status);

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  duration_hours numeric(8, 2) NOT NULL CHECK (duration_hours > 0),
  description text NOT NULL DEFAULT '',
  project_id uuid NOT NULL REFERENCES public.projects (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  tracked_external boolean NOT NULL DEFAULT false,
  billable boolean NOT NULL DEFAULT true,
  invoiced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX time_entries_date_idx ON public.time_entries (date DESC);
CREATE INDEX time_entries_project_id_date_idx ON public.time_entries (project_id, date DESC);
CREATE INDEX time_entries_billable_date_idx ON public.time_entries (date DESC)
  WHERE billable = true;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Single-user: adjust policies to your auth model (e.g. auth.uid() = constant or service role only).
