ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS inputs text[],
  ALTER COLUMN input_a DROP NOT NULL,
  ALTER COLUMN input_b DROP NOT NULL;

ALTER TABLE public.discoveries
  ADD COLUMN IF NOT EXISTS inputs text[],
  ALTER COLUMN input_a DROP NOT NULL,
  ALTER COLUMN input_b DROP NOT NULL;

-- Riempi inputs sulle righe esistenti dalla coppia a/b
UPDATE public.recipes
SET inputs = ARRAY[input_a, input_b]
WHERE inputs IS NULL AND input_a IS NOT NULL AND input_b IS NOT NULL;

UPDATE public.discoveries
SET inputs = ARRAY[input_a, input_b]
WHERE inputs IS NULL AND input_a IS NOT NULL AND input_b IS NOT NULL;

CREATE INDEX IF NOT EXISTS recipes_inputs_idx ON public.recipes USING GIN (inputs);