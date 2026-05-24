
-- Add sprite/animation URL columns to pikmin_species so admin can fully customize visuals
ALTER TABLE public.pikmin_species
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS sprite_idle_url text,
  ADD COLUMN IF NOT EXISTS sprite_walk_url text,
  ADD COLUMN IF NOT EXISTS sprite_sleep_url text,
  ADD COLUMN IF NOT EXISTS sprite_attack_url text;

-- Generic asset library for free-form sprites (decorations, FX, objects)
CREATE TABLE IF NOT EXISTS public.sprite_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'decorazione',
  name text NOT NULL,
  url text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sprite_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read sprite_assets" ON public.sprite_assets;
CREATE POLICY "members read sprite_assets" ON public.sprite_assets
  FOR SELECT TO authenticated USING (public.is_family_member());

DROP POLICY IF EXISTS "members ins sprite_assets" ON public.sprite_assets;
CREATE POLICY "members ins sprite_assets" ON public.sprite_assets
  FOR INSERT TO authenticated WITH CHECK (public.is_family_member());

DROP POLICY IF EXISTS "members upd sprite_assets" ON public.sprite_assets;
CREATE POLICY "members upd sprite_assets" ON public.sprite_assets
  FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());

DROP POLICY IF EXISTS "members del sprite_assets" ON public.sprite_assets;
CREATE POLICY "members del sprite_assets" ON public.sprite_assets
  FOR DELETE TO authenticated USING (public.is_family_member());

CREATE INDEX IF NOT EXISTS sprite_assets_category_idx ON public.sprite_assets(category);
