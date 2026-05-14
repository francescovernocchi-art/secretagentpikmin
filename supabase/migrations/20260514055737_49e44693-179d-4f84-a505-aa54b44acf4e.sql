-- Catalogo ingredienti
CREATE TABLE public.ingredients (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'comune',
  color TEXT,
  source TEXT NOT NULL DEFAULT 'mission',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);

-- Inventario per agente
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL DEFAULT 'lorenzo',
  ingredient_key TEXT NOT NULL REFERENCES public.ingredients(key) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent, ingredient_key)
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

-- Ricette predefinite (input_a + input_b -> result)
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_a TEXT NOT NULL REFERENCES public.ingredients(key),
  input_b TEXT NOT NULL REFERENCES public.ingredients(key),
  result_name TEXT NOT NULL,
  result_emoji TEXT NOT NULL,
  description TEXT,
  xp INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.recipes FOR ALL USING (true) WITH CHECK (true);

-- Cronologia esperimenti
CREATE TABLE public.discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL DEFAULT 'lorenzo',
  input_a TEXT NOT NULL,
  input_b TEXT NOT NULL,
  result_name TEXT NOT NULL,
  result_emoji TEXT NOT NULL,
  description TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.discoveries FOR ALL USING (true) WITH CHECK (true);

-- Realtime per inventario e scoperte
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discoveries;