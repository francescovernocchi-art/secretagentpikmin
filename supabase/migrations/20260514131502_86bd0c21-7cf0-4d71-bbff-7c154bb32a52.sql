CREATE TABLE public.agent_positions (
  agent_id uuid PRIMARY KEY,
  agent_name text NOT NULL,
  emoji text NOT NULL DEFAULT '🕵️',
  role text NOT NULL DEFAULT 'lorenzo',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family open" ON public.agent_positions FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_positions;
ALTER TABLE public.agent_positions REPLICA IDENTITY FULL;