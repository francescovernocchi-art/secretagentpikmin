
-- BASES
CREATE TABLE public.bases (
  agent text PRIMARY KEY,
  name text NOT NULL DEFAULT 'Base segreta',
  level integer NOT NULL DEFAULT 1,
  theme text NOT NULL DEFAULT 'foresta',
  lat double precision,
  lng double precision,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.bases FOR ALL USING (true) WITH CHECK (true);

-- BUILDING CATALOG (statico)
CREATE TABLE public.building_catalog (
  key text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🏠',
  description text,
  category text NOT NULL DEFAULT 'utility',
  max_level integer NOT NULL DEFAULT 5,
  base_cost_coins integer NOT NULL DEFAULT 50,
  base_cost_ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  base_duration_minutes integer NOT NULL DEFAULT 10,
  bonus_per_level jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.building_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.building_catalog FOR ALL USING (true) WITH CHECK (true);

-- BASE BUILDINGS
CREATE TABLE public.base_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  type text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'idle', -- idle|building|upgrading
  started_at timestamptz,
  build_end_at timestamptz,
  position_x integer NOT NULL DEFAULT 50,
  position_y integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.base_buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.base_buildings FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_base_buildings_agent ON public.base_buildings(agent);

-- BASE EVENTS
CREATE TABLE public.base_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.base_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.base_events FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_base_events_agent ON public.base_events(agent, created_at DESC);

-- BASE GIFTS (materiali tra agenti)
CREATE TABLE public.base_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent text NOT NULL,
  to_agent text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- {coins?: n, ingredients?: [..], boost_building_id?: uuid, boost_minutes?: n}
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
ALTER TABLE public.base_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.base_gifts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_base_gifts_to ON public.base_gifts(to_agent, claimed_at);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.base_buildings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.base_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.base_gifts;

-- SEED catalogo strutture
INSERT INTO public.building_catalog (key, name, emoji, description, category, base_cost_coins, base_cost_ingredients, base_duration_minutes, bonus_per_level, sort_order) VALUES
('serra',         'Serra',              '🌱', 'Coltiva ingredienti rari nel tempo.',          'production', 60,  '[]'::jsonb, 15, '{"ingredient_per_hour":1}'::jsonb, 1),
('laboratorio',   'Laboratorio',        '🧪', 'Sblocca ricette sperimentali.',                'science',    120, '["foglia"]'::jsonb, 25, '{"recipe_slots":1}'::jsonb, 2),
('radar',         'Torre Radar',        '📡', 'Estende il raggio della mappa tattica.',       'utility',    90,  '[]'::jsonb, 20, '{"radar_range_m":50}'::jsonb, 3),
('magazzino',     'Magazzino',          '📦', 'Aumenta la capienza dell''inventario.',        'utility',    50,  '[]'::jsonb, 10, '{"inventory_cap":20}'::jsonb, 4),
('incubatore',    'Incubatore Pikmin',  '🥚', 'Produce nuovi Pikmin lentamente.',             'pikmin',     150, '["foglia"]'::jsonb, 30, '{"pikmin_per_hour":1}'::jsonb, 5),
('cura',          'Centro Cura',        '💊', 'Riduce le perdite nelle spedizioni.',          'pikmin',     100, '[]'::jsonb, 20, '{"loss_reduction_pct":5}'::jsonb, 6),
('officina',      'Officina',           '🔧', 'Accelera assemblaggio pezzi navicella.',       'science',    180, '[]'::jsonb, 35, '{"ship_speed_pct":10}'::jsonb, 7),
('archivio',      'Archivio Creature',  '📚', 'Migliora ricompense dai nemici sconfitti.',    'utility',    80,  '[]'::jsonb, 15, '{"loot_bonus_pct":5}'::jsonb, 8),
('comunicazioni', 'Torre Comunicazioni','📻', 'Più ricompense nelle missioni coop.',          'coop',       110, '[]'::jsonb, 20, '{"coop_bonus_pct":5}'::jsonb, 9),
('giardino',      'Giardino Pikmin',    '🌷', 'Pikmin felici, +energia visiva alla base.',    'pikmin',     70,  '[]'::jsonb, 12, '{"happiness":10}'::jsonb, 10),
('cucina',        'Cucina',             '🍳', 'Trasforma ingredienti in bonus temporanei.',   'production', 90,  '["foglia"]'::jsonb, 18, '{"recipe_slots":1}'::jsonb, 11),
('relax',         'Zona Relax',         '🛋️', 'Rigenera Pikmin dopo le missioni.',            'pikmin',     60,  '[]'::jsonb, 10, '{"regen_per_hour":1}'::jsonb, 12);
