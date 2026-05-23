
-- Estendi bases
ALTER TABLE public.bases
  ADD COLUMN IF NOT EXISTS base_name text NOT NULL DEFAULT 'Campo Base',
  ADD COLUMN IF NOT EXISTS action_radius integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS threat_radius integer NOT NULL DEFAULT 300;

-- map_objects
CREATE TABLE IF NOT EXISTS public.map_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  object_type text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  discovered boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.map_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read map_objects" ON public.map_objects
  FOR SELECT TO authenticated USING (is_family_member());
CREATE POLICY "own writes map_objects ins" ON public.map_objects
  FOR INSERT TO authenticated WITH CHECK (agent = (current_agent_key())::text);
CREATE POLICY "own writes map_objects upd" ON public.map_objects
  FOR UPDATE TO authenticated
  USING (agent = (current_agent_key())::text)
  WITH CHECK (agent = (current_agent_key())::text);
CREATE POLICY "own writes map_objects del" ON public.map_objects
  FOR DELETE TO authenticated USING (agent = (current_agent_key())::text);

-- scouting_missions
CREATE TABLE IF NOT EXISTS public.scouting_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  target_spawn_id uuid,
  target_lat double precision NOT NULL,
  target_lng double precision NOT NULL,
  pikmin_count integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scouting_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read scouting_missions" ON public.scouting_missions
  FOR SELECT TO authenticated USING (is_family_member());
CREATE POLICY "own writes scouting_missions ins" ON public.scouting_missions
  FOR INSERT TO authenticated WITH CHECK (agent = (current_agent_key())::text);
CREATE POLICY "own writes scouting_missions upd" ON public.scouting_missions
  FOR UPDATE TO authenticated
  USING (agent = (current_agent_key())::text)
  WITH CHECK (agent = (current_agent_key())::text);

CREATE INDEX IF NOT EXISTS idx_map_objects_visible ON public.map_objects(visible) WHERE visible = true;
CREATE INDEX IF NOT EXISTS idx_scouting_active ON public.scouting_missions(status, end_at) WHERE status = 'active';
