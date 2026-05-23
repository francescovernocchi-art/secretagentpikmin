-- Aggiunge campo immagine al catalogo edifici e crea il bucket per le immagini delle strutture.
ALTER TABLE public.building_catalog
  ADD COLUMN IF NOT EXISTS image_url text;

-- Bucket pubblico per le immagini delle strutture (caricate manualmente dall'admin).
INSERT INTO storage.buckets (id, name, public)
VALUES ('building-images', 'building-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lettura pubblica
DO $$ BEGIN
  CREATE POLICY "building-images public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'building-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Scrittura limitata ai membri della famiglia (admin/papà gestiscono dal pannello)
DO $$ BEGIN
  CREATE POLICY "building-images family write"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'building-images' AND public.is_family_member());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "building-images family update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'building-images' AND public.is_family_member())
    WITH CHECK (bucket_id = 'building-images' AND public.is_family_member());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "building-images family delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'building-images' AND public.is_family_member());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;