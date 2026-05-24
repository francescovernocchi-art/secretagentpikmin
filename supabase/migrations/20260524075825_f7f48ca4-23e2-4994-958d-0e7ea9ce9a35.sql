
-- Diorami del villaggio (background HD statico)
CREATE TABLE public.village_dioramas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  biome text NOT NULL DEFAULT 'forest',
  name text NOT NULL,
  image_url text NOT NULL,
  width integer NOT NULL DEFAULT 2048,
  height integer NOT NULL DEFAULT 2048,
  is_active boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_village_dioramas_owner ON public.village_dioramas(owner_id);
CREATE INDEX idx_village_dioramas_biome ON public.village_dioramas(biome);
CREATE INDEX idx_village_dioramas_system ON public.village_dioramas(is_system) WHERE is_system = true;

ALTER TABLE public.village_dioramas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read system or own dioramas"
  ON public.village_dioramas FOR SELECT
  TO authenticated
  USING (
    public.is_family_member() AND (is_system = true OR owner_id = auth.uid())
  );

CREATE POLICY "own insert dioramas"
  ON public.village_dioramas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_family_member() AND owner_id = auth.uid() AND is_system = false
  );

CREATE POLICY "own update dioramas"
  ON public.village_dioramas FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND is_system = false);

CREATE POLICY "own delete dioramas"
  ON public.village_dioramas FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() AND is_system = false);

CREATE POLICY "papa manage system dioramas"
  ON public.village_dioramas FOR ALL
  TO authenticated
  USING (public.current_agent_key() = 'papa'::public.app_role)
  WITH CHECK (public.current_agent_key() = 'papa'::public.app_role);

CREATE TRIGGER village_dioramas_touch
  BEFORE UPDATE ON public.village_dioramas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Slot di costruzione associati ai diorami
CREATE TABLE public.village_diorama_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diorama_id uuid NOT NULL REFERENCES public.village_dioramas(id) ON DELETE CASCADE,
  slot_key text NOT NULL,
  x integer NOT NULL,
  y integer NOT NULL,
  size text NOT NULL DEFAULT 'medium',
  allowed_categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(diorama_id, slot_key)
);

CREATE INDEX idx_diorama_slots_diorama ON public.village_diorama_slots(diorama_id);

ALTER TABLE public.village_diorama_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read slots of visible dioramas"
  ON public.village_diorama_slots FOR SELECT
  TO authenticated
  USING (
    public.is_family_member() AND EXISTS (
      SELECT 1 FROM public.village_dioramas d
      WHERE d.id = diorama_id
        AND (d.is_system = true OR d.owner_id = auth.uid())
    )
  );

CREATE POLICY "write slots of own dioramas"
  ON public.village_diorama_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.village_dioramas d
      WHERE d.id = diorama_id AND d.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.village_dioramas d
      WHERE d.id = diorama_id AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY "papa manage all slots"
  ON public.village_diorama_slots FOR ALL
  TO authenticated
  USING (public.current_agent_key() = 'papa'::public.app_role)
  WITH CHECK (public.current_agent_key() = 'papa'::public.app_role);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('village-dioramas', 'village-dioramas', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "diorama images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'village-dioramas');

CREATE POLICY "members upload diorama images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'village-dioramas' AND public.is_family_member());

CREATE POLICY "members update own diorama images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'village-dioramas' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'village-dioramas' AND owner = auth.uid());

CREATE POLICY "members delete own diorama images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'village-dioramas' AND owner = auth.uid());
