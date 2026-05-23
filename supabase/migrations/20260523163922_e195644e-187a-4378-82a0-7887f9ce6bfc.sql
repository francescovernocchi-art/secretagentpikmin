-- Nuovo edificio "Ambasciata" che abilita gli scambi tra agenti
INSERT INTO public.building_catalog (key, name, emoji, description, category, max_level, base_cost_coins, base_cost_ingredients, base_duration_minutes, bonus_per_level, sort_order)
VALUES (
  'ambasciata',
  'Ambasciata',
  '🤝',
  'Apre la rotta di scambio tra Papà e Lorenzo. Più sale di livello, più oggetti possono essere scambiati per offerta.',
  'social',
  5,
  150,
  '[]'::jsonb,
  15,
  '{"trade_slots": 1, "trade_discount_pct": 5}'::jsonb,
  100
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  bonus_per_level = EXCLUDED.bonus_per_level,
  sort_order = EXCLUDED.sort_order;

-- Tabella offerte di scambio
CREATE TABLE IF NOT EXISTS public.trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent text NOT NULL,
  to_agent text NOT NULL,
  offer jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { coins?: number, pikmin?: number, ingredients?: string[] }
  request jsonb NOT NULL DEFAULT '{}'::jsonb, -- idem
  message text,
  status text NOT NULL DEFAULT 'pending',     -- pending | accepted | declined | cancelled | expired
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family open" ON public.trade_offers FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trade_offers_to_status ON public.trade_offers (to_agent, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_offers_from_status ON public.trade_offers (from_agent, status, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_offers;