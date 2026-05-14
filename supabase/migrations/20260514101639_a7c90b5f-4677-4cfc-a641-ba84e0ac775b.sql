
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'lorenzo' CHECK (role IN ('papa','lorenzo')),
  emoji TEXT NOT NULL DEFAULT '🕵️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family open" ON public.agents
  FOR ALL TO public USING (true) WITH CHECK (true);

INSERT INTO public.agents (name, pin, role, emoji) VALUES
  ('Papà', '0077', 'papa', '🕶️'),
  ('Lorenzo', '1234', 'lorenzo', '🧒')
ON CONFLICT (pin) DO NOTHING;
