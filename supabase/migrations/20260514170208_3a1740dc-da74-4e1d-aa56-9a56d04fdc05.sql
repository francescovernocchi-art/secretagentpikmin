
-- Squadrone Pikmin condiviso (un'unica riga con id='team')
CREATE TABLE IF NOT EXISTS public.pikmin_squad (
  id text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pikmin_squad (id, count) VALUES ('team', 0)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.pikmin_squad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.pikmin_squad FOR ALL USING (true) WITH CHECK (true);

-- Ledger eventi pikmin (audit + storia)
CREATE TABLE IF NOT EXISTS public.pikmin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount integer NOT NULL, -- positivo guadagnati, negativo spesi
  reason text NOT NULL,    -- 'radar', 'lab', 'ship_part', etc.
  agent text NOT NULL,     -- chi ha causato l'evento
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pikmin_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.pikmin_events FOR ALL USING (true) WITH CHECK (true);

-- Rarità sui pezzi navicella → determina il costo in pikmin per raccoglierli
ALTER TABLE public.ship_parts
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'comune';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pikmin_squad;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pikmin_events;

-- Funzione atomica: aggiungi/sottrai pikmin alla squadra. Ritorna il nuovo totale.
-- Se delta è negativo e non ci sono abbastanza pikmin, fallisce con eccezione.
CREATE OR REPLACE FUNCTION public.adjust_pikmin(p_delta integer, p_reason text, p_agent text, p_meta jsonb DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.pikmin_squad
    SET count = count + p_delta,
        updated_at = now()
    WHERE id = 'team'
    RETURNING count INTO new_count;

  IF new_count IS NULL THEN
    INSERT INTO public.pikmin_squad (id, count) VALUES ('team', GREATEST(p_delta, 0))
      RETURNING count INTO new_count;
  END IF;

  IF new_count < 0 THEN
    RAISE EXCEPTION 'Pikmin insufficienti (mancano % pikmin)', -new_count;
  END IF;

  INSERT INTO public.pikmin_events (amount, reason, agent, meta)
    VALUES (p_delta, p_reason, p_agent, p_meta);

  RETURN new_count;
END;
$$;
