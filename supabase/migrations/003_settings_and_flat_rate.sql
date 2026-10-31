-- App-wide settings (single row) and flat-rate ("forfait") projects.

CREATE TABLE public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  billable_threshold_hours numeric(5,2) NOT NULL DEFAULT 6 CHECK (billable_threshold_hours >= 0),
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  extra_holidays date[] NOT NULL DEFAULT '{}',
  work_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Single-user: adjust policies to your auth model (same as the other tables).

ALTER TABLE public.projects
  ADD COLUMN billing_type text NOT NULL DEFAULT 'hourly'
    CHECK (billing_type IN ('hourly', 'fixed_budget', 'fixed_monthly')),
  ADD COLUMN flat_amount numeric(12,2) CHECK (flat_amount IS NULL OR flat_amount >= 0),
  ADD COLUMN budget_hours numeric(8,2) CHECK (budget_hours IS NULL OR budget_hours > 0);

ALTER TABLE public.projects
  ADD CONSTRAINT projects_flat_amount_required
    CHECK (billing_type = 'hourly' OR flat_amount IS NOT NULL);
