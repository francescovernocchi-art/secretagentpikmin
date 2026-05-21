
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.ship_parts ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('game-icons', 'game-icons', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "game-icons read" ON storage.objects;
DROP POLICY IF EXISTS "game-icons write" ON storage.objects;
DROP POLICY IF EXISTS "game-icons update" ON storage.objects;
DROP POLICY IF EXISTS "game-icons delete" ON storage.objects;

CREATE POLICY "game-icons read" ON storage.objects FOR SELECT USING (bucket_id = 'game-icons');
CREATE POLICY "game-icons write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game-icons');
CREATE POLICY "game-icons update" ON storage.objects FOR UPDATE USING (bucket_id = 'game-icons');
CREATE POLICY "game-icons delete" ON storage.objects FOR DELETE USING (bucket_id = 'game-icons');
