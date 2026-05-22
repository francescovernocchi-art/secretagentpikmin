
-- ============================================================
-- SPEDIZIONI COOPERATIVE
-- ============================================================

CREATE TABLE public.mission_templates (
  key text PRIMARY KEY,
  title text NOT NULL,
  description text,
  biome text NOT NULL,
  difficulty text NOT NULL,
  duration_minutes integer NOT NULL,
  pikmin_min integer NOT NULL DEFAULT 3,
  pikmin_recommended integer NOT NULL DEFAULT 8,
  pikmin_max integer NOT NULL DEFAULT 20,
  recommended_types text[] NOT NULL DEFAULT '{}',
  rewards_pool jsonb NOT NULL DEFAULT '{}'::jsonb,
  events_pool jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.mission_templates FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.expeditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by text NOT NULL,
  is_coop boolean NOT NULL DEFAULT false,
  partner text,
  status text NOT NULL DEFAULT 'preparing',
  template_key text NOT NULL,
  title text NOT NULL,
  biome text NOT NULL,
  difficulty text NOT NULL,
  duration_minutes integer NOT NULL,
  power integer NOT NULL DEFAULT 0,
  success_chance numeric NOT NULL DEFAULT 0.5,
  risk text NOT NULL DEFAULT 'medio',
  started_at timestamptz,
  end_at timestamptz,
  resolved_at timestamptz,
  rewards jsonb NOT NULL DEFAULT '{}'::jsonb,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expeditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.expeditions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_expeditions_status ON public.expeditions (status);
CREATE INDEX idx_expeditions_end_at ON public.expeditions (end_at);

CREATE TABLE public.expedition_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expedition_id uuid NOT NULL REFERENCES public.expeditions(id) ON DELETE CASCADE,
  agent text NOT NULL,
  pikmin_total integer NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expedition_id, agent)
);
ALTER TABLE public.expedition_squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.expedition_squads FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.mission_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family open" ON public.mission_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_notifications_agent ON public.mission_notifications (agent, read_at);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.expeditions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expedition_squads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_notifications;

-- ============================================================
-- SEED missioni
-- ============================================================
INSERT INTO public.mission_templates
  (key, title, description, biome, difficulty, duration_minutes, pikmin_min, pikmin_recommended, pikmin_max, recommended_types, rewards_pool, events_pool, sort_order)
VALUES
  ('foresta_raccolta', 'Raccolta nel bosco silenzioso',
    'Una pattuglia di Pikmin esplora il sottobosco in cerca di semi e foglie luminose.',
    'foresta', 'facile', 15, 3, 6, 12,
    ARRAY['rosso','foglia'],
    '{"coins":[5,15],"ingredients":["seed_red","leaf","seed_yellow"],"xp":[10,25]}'::jsonb,
    '["creatura_amichevole","tesoro_raro"]'::jsonb, 10),

  ('foresta_creature', 'Schivare le creature notturne',
    'Una missione delicata: passare tra le tane senza svegliare i mostri.',
    'foresta', 'normale', 30, 5, 10, 18,
    ARRAY['rosso','foglia','viola'],
    '{"coins":[10,25],"ingredients":["seed_red","leaf","honey","mushroom"],"xp":[20,40]}'::jsonb,
    '["mostro","tempesta","creatura_amichevole"]'::jsonb, 20),

  ('lago_perle', 'Le perle del lago',
    'I Pikmin blu si tuffano per recuperare perle e acqua purissima.',
    'lago', 'facile', 20, 4, 8, 14,
    ARRAY['blu'],
    '{"coins":[8,18],"ingredients":["water","seed_blue","star_dust"],"xp":[15,30]}'::jsonb,
    '["tesoro_raro","creatura_amichevole"]'::jsonb, 30),

  ('lago_relitto', 'Relitto sommerso',
    'Esplorare un relitto sul fondale: lì dentro potrebbe esserci un pezzo della Navicella.',
    'lago', 'difficile', 60, 8, 14, 22,
    ARRAY['blu','roccia'],
    '{"coins":[20,50],"ingredients":["water","seed_blue","spark"],"ship_parts":true,"xp":[40,80]}'::jsonb,
    '["tempesta","mostro","tesoro_raro","segnale_misterioso"]'::jsonb, 40),

  ('urbana_perlustrazione', 'Perlustrazione urbana',
    'I Pikmin gialli sgattaiolano tra i tetti per raccogliere componenti elettronici.',
    'urbana', 'normale', 25, 4, 9, 16,
    ARRAY['giallo'],
    '{"coins":[12,28],"ingredients":["spark","sun_energy","rock_frag"],"xp":[20,40]}'::jsonb,
    '["spedizione_danneggiata","creatura_amichevole"]'::jsonb, 50),

  ('industriale_recupero', 'Recupero in zona industriale',
    'Materiali pesanti, alta tensione: serve forza e resistenza ai fulmini.',
    'industriale', 'difficile', 45, 7, 13, 20,
    ARRAY['giallo','roccia'],
    '{"coins":[18,45],"ingredients":["spark","rock_frag","sun_energy"],"ship_parts":true,"xp":[35,70]}'::jsonb,
    '["mostro","spedizione_danneggiata","tesoro_raro"]'::jsonb, 60),

  ('caverna_cristalli', 'Cristalli della caverna',
    'Una galleria profonda piena di cristalli rari... e di tane sconosciute.',
    'caverna', 'pericolosa', 75, 10, 16, 25,
    ARRAY['roccia','viola','rosso'],
    '{"coins":[30,70],"ingredients":["rock_frag","mushroom","star_dust","spark"],"ship_parts":true,"xp":[60,110]}'::jsonb,
    '["mostro","tempesta","tesoro_raro","segnale_misterioso"]'::jsonb, 70),

  ('rovine_archivio', 'Archivio delle rovine',
    'Tra antichi pilastri si nasconde un archivio dimenticato di una civiltà perduta.',
    'rovine', 'difficile', 50, 8, 14, 20,
    ARRAY['bianco','viola','foglia'],
    '{"coins":[22,55],"ingredients":["seed_white","star_dust","honey"],"ship_parts":true,"xp":[40,80]}'::jsonb,
    '["segnale_misterioso","tesoro_raro","creatura_amichevole"]'::jsonb, 80),

  ('rovine_guardiano', 'Il guardiano delle rovine',
    'Una creatura leggendaria custodisce un tesoro inimmaginabile.',
    'rovine', 'leggendaria', 120, 15, 22, 30,
    ARRAY['rosso','roccia','viola','bianco'],
    '{"coins":[80,200],"ingredients":["seed_white","star_dust","honey","mushroom","spark"],"ship_parts":true,"xp":[120,250]}'::jsonb,
    '["mostro","tempesta","segnale_misterioso","tesoro_raro"]'::jsonb, 90),

  ('serra_polline', 'Polline della serra tropicale',
    'I Pikmin foglia raccolgono polline luminoso in una serra calda e umida.',
    'serra', 'facile', 18, 3, 7, 12,
    ARRAY['foglia','rosso'],
    '{"coins":[6,16],"ingredients":["leaf","honey","seed_yellow"],"xp":[12,28]}'::jsonb,
    '["creatura_amichevole","tesoro_raro"]'::jsonb, 100),

  ('serra_fioritura', 'La grande fioritura',
    'Una fioritura rarissima dura solo poche ore: cogliere il momento giusto è tutto.',
    'serra', 'normale', 35, 6, 11, 18,
    ARRAY['foglia','blu'],
    '{"coins":[15,32],"ingredients":["leaf","honey","star_dust","seed_blue"],"xp":[25,50]}'::jsonb,
    '["tempesta","tesoro_raro","creatura_amichevole"]'::jsonb, 110),

  ('caverna_eco', 'Eco nella caverna profonda',
    'Un segnale strano riecheggia nelle gallerie: potrebbe essere un richiamo per pochi audaci.',
    'caverna', 'leggendaria', 150, 18, 25, 35,
    ARRAY['blu','roccia','viola','bianco','rosso'],
    '{"coins":[120,250],"ingredients":["water","rock_frag","mushroom","star_dust","spark","seed_white"],"ship_parts":true,"xp":[160,300]}'::jsonb,
    '["mostro","tempesta","segnale_misterioso","tesoro_raro","spedizione_danneggiata"]'::jsonb, 120);
