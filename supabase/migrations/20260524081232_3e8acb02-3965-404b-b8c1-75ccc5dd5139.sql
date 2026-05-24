
CREATE TABLE IF NOT EXISTS public.village_biomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '🌍',
  image_url text,
  tagline text,
  bonuses text[] NOT NULL DEFAULT '{}',
  accent text NOT NULL DEFAULT '#7cd99a',
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.village_biomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read village_biomes"
  ON public.village_biomes FOR SELECT
  TO authenticated
  USING (public.is_family_member());

CREATE POLICY "papa insert village_biomes"
  ON public.village_biomes FOR INSERT
  TO authenticated
  WITH CHECK (public.current_agent_key() = 'papa'::public.app_role);

CREATE POLICY "papa update village_biomes"
  ON public.village_biomes FOR UPDATE
  TO authenticated
  USING (public.current_agent_key() = 'papa'::public.app_role)
  WITH CHECK (public.current_agent_key() = 'papa'::public.app_role);

CREATE POLICY "papa delete village_biomes"
  ON public.village_biomes FOR DELETE
  TO authenticated
  USING (public.current_agent_key() = 'papa'::public.app_role);

CREATE TRIGGER village_biomes_touch
  BEFORE UPDATE ON public.village_biomes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
