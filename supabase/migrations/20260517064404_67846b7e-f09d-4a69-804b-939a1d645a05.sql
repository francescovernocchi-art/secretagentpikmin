
-- Pikmin species archive
CREATE TABLE public.pikmin_species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  color text,
  image_url text,
  description text,
  abilities text[] NOT NULL DEFAULT '{}',
  resistances text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  first_appearance text,
  exploration_use text,
  combat_use text,
  source_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pikmin_species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.pikmin_species FOR ALL USING (true) WITH CHECK (true);

-- Enemies archive
CREATE TABLE public.enemies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '👾',
  image_url text,
  description text,
  danger_level integer NOT NULL DEFAULT 1 CHECK (danger_level BETWEEN 1 AND 5),
  habitat text,
  behavior text,
  speed text,
  damage integer NOT NULL DEFAULT 1,
  hp integer NOT NULL DEFAULT 10,
  spawn_probability numeric NOT NULL DEFAULT 0.1 CHECK (spawn_probability >= 0 AND spawn_probability <= 1),
  pikmin_eat_min integer NOT NULL DEFAULT 1,
  pikmin_eat_max integer NOT NULL DEFAULT 3,
  recommended_pikmin text[] NOT NULL DEFAULT '{}',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.enemies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.enemies FOR ALL USING (true) WITH CHECK (true);

-- Map enemy spawns
CREATE TABLE public.map_enemy_spawns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enemy_id uuid NOT NULL REFERENCES public.enemies(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  spawned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  defeated_by text,
  defeated_at timestamptz
);
ALTER TABLE public.map_enemy_spawns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.map_enemy_spawns FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_map_enemy_spawns_active ON public.map_enemy_spawns(active);

-- Battle logs
CREATE TABLE public.battle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enemy_id uuid REFERENCES public.enemies(id) ON DELETE SET NULL,
  enemy_name text NOT NULL,
  agent text NOT NULL DEFAULT 'lorenzo',
  result text NOT NULL,
  pikmin_sent jsonb NOT NULL DEFAULT '{}'::jsonb,
  pikmin_lost jsonb NOT NULL DEFAULT '{}'::jsonb,
  rewards jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.battle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.battle_logs FOR ALL USING (true) WITH CHECK (true);

-- Extend pikmin_squad with per-type breakdown
ALTER TABLE public.pikmin_squad ADD COLUMN IF NOT EXISTS breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Update adjust_pikmin to support optional pikmin type
CREATE OR REPLACE FUNCTION public.adjust_pikmin(p_delta integer, p_reason text, p_agent text, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_count integer;
  p_type text;
  cur_breakdown jsonb;
  cur_type_count integer;
BEGIN
  p_type := COALESCE(p_meta->>'type', NULL);

  UPDATE public.pikmin_squad
    SET count = count + p_delta,
        updated_at = now()
    WHERE id = 'team'
    RETURNING count, breakdown INTO new_count, cur_breakdown;

  IF new_count IS NULL THEN
    INSERT INTO public.pikmin_squad (id, count) VALUES ('team', GREATEST(p_delta, 0))
      RETURNING count, breakdown INTO new_count, cur_breakdown;
  END IF;

  IF new_count < 0 THEN
    RAISE EXCEPTION 'Pikmin insufficienti (mancano % pikmin)', -new_count;
  END IF;

  IF p_type IS NOT NULL THEN
    cur_type_count := COALESCE((cur_breakdown->>p_type)::integer, 0) + p_delta;
    IF cur_type_count < 0 THEN cur_type_count := 0; END IF;
    UPDATE public.pikmin_squad
      SET breakdown = jsonb_set(COALESCE(breakdown, '{}'::jsonb), ARRAY[p_type], to_jsonb(cur_type_count), true)
      WHERE id = 'team';
  END IF;

  INSERT INTO public.pikmin_events (amount, reason, agent, meta)
    VALUES (p_delta, p_reason, p_agent, p_meta);

  RETURN new_count;
END;
$function$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_enemy_spawns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_logs;
