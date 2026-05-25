-- Estensione slot per editor visuale
ALTER TABLE public.village_diorama_slots
  ADD COLUMN IF NOT EXISTS width integer NOT NULL DEFAULT 96,
  ADD COLUMN IF NOT EXISTS height integer NOT NULL DEFAULT 96,
  ADD COLUMN IF NOT EXISTS rotation integer NOT NULL DEFAULT 0;

-- Tabella asset strutture per bioma/livello/variante
CREATE TABLE IF NOT EXISTS public.village_structure_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_type text NOT NULL,
  biome_key text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  variant text NOT NULL DEFAULT 'default',
  asset_url text NOT NULL,
  shadow_url text,
  glow_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_type, biome_key, level, variant)
);

CREATE INDEX IF NOT EXISTS idx_structure_assets_lookup
  ON public.village_structure_assets (building_type, biome_key, level);

ALTER TABLE public.village_structure_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read structure assets" ON public.village_structure_assets;
CREATE POLICY "members read structure assets"
  ON public.village_structure_assets
  FOR SELECT TO authenticated
  USING (is_family_member());

DROP POLICY IF EXISTS "papa manage structure assets" ON public.village_structure_assets;
CREATE POLICY "papa manage structure assets"
  ON public.village_structure_assets
  FOR ALL TO authenticated
  USING (current_agent_key() = 'papa'::app_role)
  WITH CHECK (current_agent_key() = 'papa'::app_role);

CREATE TRIGGER trg_structure_assets_updated_at
  BEFORE UPDATE ON public.village_structure_assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();