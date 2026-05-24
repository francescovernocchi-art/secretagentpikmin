
ALTER TABLE public.base_buildings 
  ADD COLUMN IF NOT EXISTS slot_key text,
  ADD COLUMN IF NOT EXISTS biome_key text;

CREATE INDEX IF NOT EXISTS idx_base_buildings_agent_biome ON public.base_buildings(agent, biome_key);
CREATE INDEX IF NOT EXISTS idx_base_buildings_slot ON public.base_buildings(agent, biome_key, slot_key);
