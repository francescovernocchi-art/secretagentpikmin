
-- Bucket pubblico per le immagini dei nemici
INSERT INTO storage.buckets (id, name, public)
VALUES ('enemy-images', 'enemy-images', true)
ON CONFLICT (id) DO NOTHING;

-- Lettura pubblica
DROP POLICY IF EXISTS "enemy-images public read" ON storage.objects;
CREATE POLICY "enemy-images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'enemy-images');

-- Upload/aggiornamento/cancellazione aperti (coerente con il resto del progetto "family open")
DROP POLICY IF EXISTS "enemy-images open write" ON storage.objects;
CREATE POLICY "enemy-images open write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'enemy-images');

DROP POLICY IF EXISTS "enemy-images open update" ON storage.objects;
CREATE POLICY "enemy-images open update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'enemy-images');

DROP POLICY IF EXISTS "enemy-images open delete" ON storage.objects;
CREATE POLICY "enemy-images open delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'enemy-images');
