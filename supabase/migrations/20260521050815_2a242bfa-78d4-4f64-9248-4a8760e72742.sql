
ALTER TABLE public.enemies
  ADD COLUMN IF NOT EXISTS activity_period text NOT NULL DEFAULT 'sempre';

ALTER TABLE public.enemies
  DROP CONSTRAINT IF EXISTS enemies_activity_period_check;

ALTER TABLE public.enemies
  ADD CONSTRAINT enemies_activity_period_check
  CHECK (activity_period IN ('diurno','notturno','crepuscolare','sempre'));
