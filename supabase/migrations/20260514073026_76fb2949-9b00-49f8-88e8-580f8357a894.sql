-- Tabella per i drop geolocalizzati piazzati da papà
CREATE TABLE public.drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by text NOT NULL DEFAULT 'papa',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 20,
  kind text NOT NULL DEFAULT 'ingredient', -- ingredient | object | mission
  payload_key text,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎁',
  xp integer NOT NULL DEFAULT 10,
  note text,
  status text NOT NULL DEFAULT 'active', -- active | collected | expired
  collected_by text,
  collected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family open" ON public.drops
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX idx_drops_status ON public.drops(status);
CREATE INDEX idx_drops_created_at ON public.drops(created_at DESC);

-- Abilita realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.drops;
ALTER TABLE public.drops REPLICA IDENTITY FULL;