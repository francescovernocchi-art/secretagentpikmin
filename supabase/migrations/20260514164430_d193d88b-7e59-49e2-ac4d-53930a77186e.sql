
-- Coins wallet per agent
CREATE TABLE public.agent_coins (
  agent text PRIMARY KEY,
  coins integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_coins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.agent_coins FOR ALL USING (true) WITH CHECK (true);

-- Coin transaction log
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.coin_transactions FOR ALL USING (true) WITH CHECK (true);

-- Coin reward on missions
ALTER TABLE public.missions ADD COLUMN coin_reward integer NOT NULL DEFAULT 0;

-- Pricing on ingredients (buyable in market when > 0)
ALTER TABLE public.ingredients ADD COLUMN price_coins integer;

-- Recipes can be locked & purchasable
ALTER TABLE public.recipes ADD COLUMN price_coins integer;
ALTER TABLE public.recipes ADD COLUMN locked boolean NOT NULL DEFAULT false;

-- Per-agent unlocks
CREATE TABLE public.recipe_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  recipe_id uuid NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent, recipe_id)
);
ALTER TABLE public.recipe_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.recipe_unlocks FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_coins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_unlocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;

-- Seed default coin prices for existing ingredients
UPDATE public.ingredients SET price_coins = 5 WHERE rarity = 'comune' AND price_coins IS NULL;
UPDATE public.ingredients SET price_coins = 12 WHERE rarity = 'raro' AND price_coins IS NULL;
UPDATE public.ingredients SET price_coins = 25 WHERE rarity = 'leggendario' AND price_coins IS NULL;
UPDATE public.ingredients SET price_coins = 8 WHERE price_coins IS NULL;
