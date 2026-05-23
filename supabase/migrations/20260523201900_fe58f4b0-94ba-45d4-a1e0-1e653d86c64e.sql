
-- Extend bases with faction & energy & defense
ALTER TABLE public.bases
  ADD COLUMN IF NOT EXISTS faction text,
  ADD COLUMN IF NOT EXISTS energy_current integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS energy_max integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS defense_rating integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS layout jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Extend building_catalog
ALTER TABLE public.building_catalog
  ADD COLUMN IF NOT EXISTS faction_required text,
  ADD COLUMN IF NOT EXISTS visual_stages jsonb NOT NULL DEFAULT '[]'::jsonb;

-- village_walls
CREATE TABLE IF NOT EXISTS public.village_walls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  from_x integer NOT NULL,
  from_y integer NOT NULL,
  to_x integer NOT NULL,
  to_y integer NOT NULL,
  level integer NOT NULL DEFAULT 1,
  material text NOT NULL DEFAULT 'wood',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.village_walls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read village_walls" ON public.village_walls;
CREATE POLICY "members read village_walls" ON public.village_walls
  FOR SELECT TO authenticated USING (public.is_family_member());

DROP POLICY IF EXISTS "own writes village_walls ins" ON public.village_walls;
CREATE POLICY "own writes village_walls ins" ON public.village_walls
  FOR INSERT TO authenticated WITH CHECK (agent = (public.current_agent_key())::text);

DROP POLICY IF EXISTS "own writes village_walls upd" ON public.village_walls;
CREATE POLICY "own writes village_walls upd" ON public.village_walls
  FOR UPDATE TO authenticated
  USING (agent = (public.current_agent_key())::text)
  WITH CHECK (agent = (public.current_agent_key())::text);

DROP POLICY IF EXISTS "own writes village_walls del" ON public.village_walls;
CREATE POLICY "own writes village_walls del" ON public.village_walls
  FOR DELETE TO authenticated USING (agent = (public.current_agent_key())::text);

-- village_events
CREATE TABLE IF NOT EXISTS public.village_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'normal',
  title text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.village_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read village_events" ON public.village_events;
CREATE POLICY "members read village_events" ON public.village_events
  FOR SELECT TO authenticated USING (public.is_family_member());

DROP POLICY IF EXISTS "own writes village_events ins" ON public.village_events;
CREATE POLICY "own writes village_events ins" ON public.village_events
  FOR INSERT TO authenticated WITH CHECK (agent = (public.current_agent_key())::text);

DROP POLICY IF EXISTS "members upd village_events" ON public.village_events;
CREATE POLICY "members upd village_events" ON public.village_events
  FOR UPDATE TO authenticated
  USING (public.is_family_member())
  WITH CHECK (public.is_family_member());

-- Touch updated_at triggers
DROP TRIGGER IF EXISTS trg_village_walls_updated ON public.village_walls;
CREATE TRIGGER trg_village_walls_updated BEFORE UPDATE ON public.village_walls
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed catalog (idempotent)
INSERT INTO public.building_catalog (key, name, emoji, category, description, base_cost_coins, base_duration_minutes, max_level, sort_order, bonus_per_level)
VALUES
  ('command_center','Centro di Comando','🏛️','utility','Cuore del villaggio. Sblocca nuove costruzioni.',0,1,10,1,'{"unlock_slots":1}'::jsonb),
  ('pikmin_greenhouse','Serra Pikmin','🌱','production','Genera Pikmin nel tempo.',80,15,5,10,'{"pikmin_per_hour":2}'::jsonb),
  ('gadget_lab','Laboratorio Gadget','🧪','research','Sblocca ricette avanzate.',150,30,5,20,'{"recipe_slots":1}'::jsonb),
  ('mission_hangar','Hangar Missioni','🚀','utility','Slot missione extra.',120,25,5,30,'{"mission_slots":1}'::jsonb),
  ('defense_tower','Torre di Difesa','🗼','defense','Difende il villaggio dai mostri.',100,20,5,40,'{"defense":15}'::jsonb),
  ('radar_station','Stazione Radar','📡','defense','Rileva minacce nelle vicinanze.',180,35,5,50,'{"scan_range":200}'::jsonb),
  ('energy_reactor','Reattore Energetico','⚡','energy','Aumenta la capacità energetica.',200,40,5,60,'{"energy_max":50}'::jsonb),
  ('storage_warehouse','Magazzino','📦','utility','Più spazio per gli ingredienti.',90,18,5,70,'{"storage":50}'::jsonb),
  ('training_camp','Campo di Addestramento','🥋','production','Potenzia i Pikmin in combattimento.',140,28,5,80,'{"attack":10}'::jsonb),
  ('medical_station','Stazione Medica','⛑️','utility','Cura i Pikmin feriti più velocemente.',110,22,5,90,'{"heal_rate":1}'::jsonb),
  ('drone_factory','Fabbrica Droni','🛸','defense','Schiera droni difensivi autonomi.',250,45,5,100,'{"drones":1}'::jsonb),
  ('research_lab','Laboratorio Ricerca','🔬','research','Scoperte rare e tecnologie.',220,40,5,110,'{"research_speed":1}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  bonus_per_level = EXCLUDED.bonus_per_level;
