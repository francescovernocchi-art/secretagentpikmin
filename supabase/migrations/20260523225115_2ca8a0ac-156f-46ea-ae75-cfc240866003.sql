
-- Carte collezionabili
CREATE TABLE public.collectible_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  image_url text,
  rarity text NOT NULL DEFAULT 'comune',
  category text NOT NULL DEFAULT 'generale',
  sort_order int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.collectible_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all collectible_cards" ON public.collectible_cards
  FOR ALL TO authenticated
  USING (public.is_family_member())
  WITH CHECK (public.is_family_member());

CREATE TABLE public.card_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  agent text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual'
);
ALTER TABLE public.card_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read card_unlocks" ON public.card_unlocks
  FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes card_unlocks ins" ON public.card_unlocks
  FOR INSERT TO authenticated WITH CHECK (agent = (public.current_agent_key())::text);

-- Asset audio (musica/sfx) — uploadati dall'admin
CREATE TABLE public.audio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'music', -- music | sfx | ambient
  page text, -- nome route (es. "villaggio") oppure null = globale
  loop boolean NOT NULL DEFAULT true,
  volume numeric NOT NULL DEFAULT 0.6,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all audio_assets" ON public.audio_assets
  FOR ALL TO authenticated
  USING (public.is_family_member())
  WITH CHECK (public.is_family_member());

-- Trigger updated_at
CREATE TRIGGER trg_collectible_cards_upd BEFORE UPDATE ON public.collectible_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_audio_assets_upd BEFORE UPDATE ON public.audio_assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage buckets pubblici per immagini/audio caricati dall'admin
INSERT INTO storage.buckets (id, name, public) VALUES
  ('pikmin-images', 'pikmin-images', true),
  ('card-images', 'card-images', true),
  ('reward-images', 'reward-images', true),
  ('mission-images', 'mission-images', true),
  ('audio-assets', 'audio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: lettura pubblica, scrittura solo admin "papa"
CREATE POLICY "admin uploads pikmin-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pikmin-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin updates pikmin-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'pikmin-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin deletes pikmin-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pikmin-images' AND public.current_agent_key()::text = 'papa');

CREATE POLICY "admin uploads card-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'card-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin updates card-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'card-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin deletes card-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'card-images' AND public.current_agent_key()::text = 'papa');

CREATE POLICY "admin uploads reward-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reward-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin updates reward-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'reward-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin deletes reward-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'reward-images' AND public.current_agent_key()::text = 'papa');

CREATE POLICY "admin uploads mission-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mission-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin updates mission-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'mission-images' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin deletes mission-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'mission-images' AND public.current_agent_key()::text = 'papa');

CREATE POLICY "admin uploads audio-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-assets' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin updates audio-assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'audio-assets' AND public.current_agent_key()::text = 'papa');
CREATE POLICY "admin deletes audio-assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'audio-assets' AND public.current_agent_key()::text = 'papa');
