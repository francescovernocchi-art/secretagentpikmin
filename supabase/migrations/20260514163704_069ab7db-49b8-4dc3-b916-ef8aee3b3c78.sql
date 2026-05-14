-- Catalogo pezzi della navicella (gestito dal Comandante)
CREATE TABLE public.ship_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🛠️',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ship_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.ship_parts FOR ALL USING (true) WITH CHECK (true);

-- Pezzi recuperati dalla squadra (uno per pezzo del catalogo)
CREATE TABLE public.ship_parts_collected (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_key text NOT NULL UNIQUE REFERENCES public.ship_parts(key) ON DELETE CASCADE,
  collected_by text NOT NULL DEFAULT 'lorenzo',
  collected_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'drop',
  drop_id uuid,
  mission_id uuid
);

ALTER TABLE public.ship_parts_collected ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.ship_parts_collected FOR ALL USING (true) WITH CHECK (true);

-- Possibilità di assegnare un pezzo come ricompensa di una missione
ALTER TABLE public.missions ADD COLUMN reward_part_key text;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ship_parts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ship_parts_collected;

-- Catalogo iniziale (12 pezzi stile Pikmin) — il Comandante può modificarli
INSERT INTO public.ship_parts (key, name, emoji, description, sort_order) VALUES
  ('reattore',  'Reattore principale', '⚛️', 'Cuore energetico della navicella.', 1),
  ('antenna',   'Antenna lunga gittata', '📡', 'Comunicazioni con la base.', 2),
  ('radar',     'Radar di bordo', '🛰️', 'Individua bersagli a distanza.', 3),
  ('scafo',     'Scafo di prua', '🛡️', 'Protezione frontale rinforzata.', 4),
  ('cabina',    'Cabina di pilotaggio', '🪟', 'Postazione del pilota.', 5),
  ('motore',    'Motore ionico', '🚀', 'Spinta principale.', 6),
  ('giroscopio','Giroscopio', '🧭', 'Stabilità in volo.', 7),
  ('serbatoio', 'Serbatoio carburante', '⛽', 'Riserva energetica.', 8),
  ('carrello',  'Carrello di atterraggio', '🛞', 'Atterraggi sicuri.', 9),
  ('luci',      'Fari di ricognizione', '💡', 'Visione notturna.', 10),
  ('scudo',     'Generatore scudo', '🔰', 'Difesa attiva.', 11),
  ('chiave',    'Chiave di accensione', '🗝️', 'Indispensabile per partire.', 12);
