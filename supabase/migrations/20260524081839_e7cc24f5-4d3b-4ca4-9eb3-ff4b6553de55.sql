CREATE TABLE IF NOT EXISTS public.village_diorama_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'custom',
  biome_key text,
  description text,
  icon text NOT NULL DEFAULT '✨',
  overlay_image_url text,
  effects jsonb NOT NULL DEFAULT '{}'::jsonb,
  bonuses jsonb NOT NULL DEFAULT '[]'::jsonb,
  maluses jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority integer NOT NULL DEFAULT 50,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.village_diorama_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read diorama_events"
  ON public.village_diorama_events FOR SELECT
  TO authenticated
  USING (public.is_family_member());

CREATE POLICY "papa insert diorama_events"
  ON public.village_diorama_events FOR INSERT
  TO authenticated
  WITH CHECK (public.current_agent_key() = 'papa'::public.app_role);

CREATE POLICY "papa update diorama_events"
  ON public.village_diorama_events FOR UPDATE
  TO authenticated
  USING (public.current_agent_key() = 'papa'::public.app_role)
  WITH CHECK (public.current_agent_key() = 'papa'::public.app_role);

CREATE POLICY "papa delete diorama_events"
  ON public.village_diorama_events FOR DELETE
  TO authenticated
  USING (public.current_agent_key() = 'papa'::public.app_role);

CREATE TRIGGER trg_village_diorama_events_updated_at
  BEFORE UPDATE ON public.village_diorama_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_diorama_events_active ON public.village_diorama_events(is_active);
CREATE INDEX IF NOT EXISTS idx_diorama_events_biome ON public.village_diorama_events(biome_key);

ALTER PUBLICATION supabase_realtime ADD TABLE public.village_diorama_events;