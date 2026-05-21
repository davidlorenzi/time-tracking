-- Add default_billable flag to projects so new time entries inherit the project's billing preference.
ALTER TABLE public.projects
  ADD COLUMN default_billable boolean NOT NULL DEFAULT true;
