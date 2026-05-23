
-- ============================================================
-- 1. ROLES + PROFILES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('papa', 'lorenzo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_key public.app_role NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🕵️',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_agent_key()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agent_key FROM public.profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_family_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.current_agent_key() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_family_member() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_agent_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member() TO authenticated;

-- profile RLS
DROP POLICY IF EXISTS "family read profiles" ON public.profiles;
CREATE POLICY "family read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_family_member());
DROP POLICY IF EXISTS "user updates own profile" ON public.profiles;
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, agent_key, name, emoji)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'agent_key', 'lorenzo')::public.app_role,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'emoji', '🕵️')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 2. AGENTS: drop pin, switch RLS
-- ============================================================
ALTER TABLE public.agents DROP COLUMN IF EXISTS pin;

DROP POLICY IF EXISTS "family open" ON public.agents;
CREATE POLICY "members read agents" ON public.agents FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members write agents" ON public.agents FOR INSERT TO authenticated WITH CHECK (public.is_family_member());
CREATE POLICY "members update agents" ON public.agents FOR UPDATE TO authenticated USING (public.is_family_member());

-- ============================================================
-- 3. Reusable: replace "family open" with authenticated members policies
-- ============================================================
-- Helper macro: tables shared read-only between members, anyone authenticated can write
-- We'll apply per-table.

-- Shared tables (read+write for any authenticated member, no per-agent ownership)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pikmin_squad','pikmin_events','pikmin_species','ingredients','recipes',
    'mission_templates','building_catalog','enemies','ship_parts','memories','messages'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "family open" ON public.%I', t);
    EXECUTE format('CREATE POLICY "members all %I" ON public.%I FOR ALL TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member())', t, t);
  END LOOP;
END $$;

-- Per-agent tables: read shared, write only on rows you own
-- agent column based
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'agent_coins','base_buildings','base_events','bases','battle_logs',
    'coin_transactions','discoveries','expedition_squads','inventory',
    'mission_notifications','recipe_unlocks','expeditions'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "family open" ON public.%I', t);
    EXECUTE format('CREATE POLICY "members read %I" ON public.%I FOR SELECT TO authenticated USING (public.is_family_member())', t, t);
  END LOOP;
END $$;

-- Writes scoped to current_agent_key()
CREATE POLICY "own writes agent_coins ins" ON public.agent_coins FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "own writes agent_coins upd" ON public.agent_coins FOR UPDATE TO authenticated USING (agent = public.current_agent_key()::text) WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes base_buildings ins" ON public.base_buildings FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "own writes base_buildings upd" ON public.base_buildings FOR UPDATE TO authenticated USING (agent = public.current_agent_key()::text) WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "own writes base_buildings del" ON public.base_buildings FOR DELETE TO authenticated USING (agent = public.current_agent_key()::text);

CREATE POLICY "own writes base_events ins" ON public.base_events FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes bases ins" ON public.bases FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "own writes bases upd" ON public.bases FOR UPDATE TO authenticated USING (agent = public.current_agent_key()::text) WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes battle_logs ins" ON public.battle_logs FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes coin_transactions ins" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes discoveries ins" ON public.discoveries FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes expedition_squads ins" ON public.expedition_squads FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "own writes expedition_squads upd" ON public.expedition_squads FOR UPDATE TO authenticated USING (agent = public.current_agent_key()::text) WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes inventory ins" ON public.inventory FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "own writes inventory upd" ON public.inventory FOR UPDATE TO authenticated USING (agent = public.current_agent_key()::text) WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "own writes inventory del" ON public.inventory FOR DELETE TO authenticated USING (agent = public.current_agent_key()::text);

CREATE POLICY "own writes mission_notifications upd" ON public.mission_notifications FOR UPDATE TO authenticated USING (agent = public.current_agent_key()::text) WITH CHECK (agent = public.current_agent_key()::text);
CREATE POLICY "members ins mission_notifications" ON public.mission_notifications FOR INSERT TO authenticated WITH CHECK (public.is_family_member());

CREATE POLICY "own writes recipe_unlocks ins" ON public.recipe_unlocks FOR INSERT TO authenticated WITH CHECK (agent = public.current_agent_key()::text);

CREATE POLICY "own writes expeditions ins" ON public.expeditions FOR INSERT TO authenticated WITH CHECK (created_by = public.current_agent_key()::text);
CREATE POLICY "own writes expeditions upd" ON public.expeditions FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());

-- ============================================================
-- 4. Sensitive location tables (gps): READ authenticated only
-- ============================================================
DROP POLICY IF EXISTS "family open" ON public.agent_positions;
CREATE POLICY "members read positions" ON public.agent_positions FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own write position ins" ON public.agent_positions FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "own write position upd" ON public.agent_positions FOR UPDATE TO authenticated USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());
CREATE POLICY "own write position del" ON public.agent_positions FOR DELETE TO authenticated USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "family open" ON public.drops;
CREATE POLICY "members read drops" ON public.drops FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members ins drops" ON public.drops FOR INSERT TO authenticated WITH CHECK (created_by = public.current_agent_key()::text);
CREATE POLICY "members upd drops" ON public.drops FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());

DROP POLICY IF EXISTS "family open" ON public.map_enemy_spawns;
CREATE POLICY "members all map_enemy_spawns" ON public.map_enemy_spawns FOR ALL TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());

-- ============================================================
-- 5. Missions, ship parts, rewards, gifts, trades
-- ============================================================
DROP POLICY IF EXISTS "family open" ON public.missions;
CREATE POLICY "members read missions" ON public.missions FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members ins missions" ON public.missions FOR INSERT TO authenticated WITH CHECK (created_by = public.current_agent_key()::text);
CREATE POLICY "members upd missions" ON public.missions FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());
CREATE POLICY "members del missions" ON public.missions FOR DELETE TO authenticated USING (created_by = public.current_agent_key()::text);

DROP POLICY IF EXISTS "family open" ON public.ship_parts_collected;
CREATE POLICY "members read ship_parts_collected" ON public.ship_parts_collected FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members ins ship_parts_collected" ON public.ship_parts_collected FOR INSERT TO authenticated WITH CHECK (collected_by = public.current_agent_key()::text);

DROP POLICY IF EXISTS "family open" ON public.rewards;
CREATE POLICY "members read rewards" ON public.rewards FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members ins rewards" ON public.rewards FOR INSERT TO authenticated WITH CHECK (public.is_family_member());

DROP POLICY IF EXISTS "family open" ON public.base_gifts;
CREATE POLICY "members read base_gifts" ON public.base_gifts FOR SELECT TO authenticated USING (
  from_agent = public.current_agent_key()::text OR to_agent = public.current_agent_key()::text
);
CREATE POLICY "members ins base_gifts" ON public.base_gifts FOR INSERT TO authenticated WITH CHECK (from_agent = public.current_agent_key()::text);
CREATE POLICY "members upd base_gifts" ON public.base_gifts FOR UPDATE TO authenticated USING (to_agent = public.current_agent_key()::text) WITH CHECK (to_agent = public.current_agent_key()::text);

DROP POLICY IF EXISTS "family open" ON public.trade_offers;
CREATE POLICY "members read trade_offers" ON public.trade_offers FOR SELECT TO authenticated USING (
  from_agent = public.current_agent_key()::text OR to_agent = public.current_agent_key()::text
);
CREATE POLICY "members ins trade_offers" ON public.trade_offers FOR INSERT TO authenticated WITH CHECK (from_agent = public.current_agent_key()::text);
CREATE POLICY "members upd trade_offers" ON public.trade_offers FOR UPDATE TO authenticated USING (
  from_agent = public.current_agent_key()::text OR to_agent = public.current_agent_key()::text
) WITH CHECK (
  from_agent = public.current_agent_key()::text OR to_agent = public.current_agent_key()::text
);

-- ============================================================
-- 6. SECURITY DEFINER function lockdown
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.adjust_pikmin(integer, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.adjust_pikmin(integer, text, text, jsonb) TO authenticated;

-- Re-declare adjust_pikmin to enforce caller identity check
CREATE OR REPLACE FUNCTION public.adjust_pikmin(p_delta integer, p_reason text, p_agent text, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_count integer;
  p_type text;
  cur_breakdown jsonb;
  cur_type_count integer;
  caller_key text;
BEGIN
  -- caller must be a family member
  caller_key := public.current_agent_key()::text;
  IF caller_key IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- pin agent to caller's identity, ignore p_agent input
  p_agent := caller_key;

  p_type := COALESCE(p_meta->>'type', NULL);

  UPDATE public.pikmin_squad
    SET count = count + p_delta,
        updated_at = now()
    WHERE id = 'team'
    RETURNING count, breakdown INTO new_count, cur_breakdown;

  IF new_count IS NULL THEN
    INSERT INTO public.pikmin_squad (id, count) VALUES ('team', GREATEST(p_delta, 0))
      RETURNING count, breakdown INTO new_count, cur_breakdown;
  END IF;

  IF new_count < 0 THEN
    RAISE EXCEPTION 'Pikmin insufficienti (mancano % pikmin)', -new_count;
  END IF;

  IF p_type IS NOT NULL THEN
    cur_type_count := COALESCE((cur_breakdown->>p_type)::integer, 0) + p_delta;
    IF cur_type_count < 0 THEN cur_type_count := 0; END IF;
    UPDATE public.pikmin_squad
      SET breakdown = jsonb_set(COALESCE(breakdown, '{}'::jsonb), ARRAY[p_type], to_jsonb(cur_type_count), true)
      WHERE id = 'team';
  END IF;

  INSERT INTO public.pikmin_events (amount, reason, agent, meta)
    VALUES (p_delta, p_reason, p_agent, p_meta);

  RETURN new_count;
END;
$function$;

-- ============================================================
-- 7. STORAGE: lock captures bucket, restrict listing
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'captures';

-- captures: only family members can read/write their captures
DROP POLICY IF EXISTS "captures public read" ON storage.objects;
DROP POLICY IF EXISTS "captures auth read" ON storage.objects;
CREATE POLICY "captures auth read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'captures' AND public.is_family_member());
DROP POLICY IF EXISTS "captures auth write" ON storage.objects;
CREATE POLICY "captures auth write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'captures' AND public.is_family_member());

-- game-icons / enemy-images: keep public read, write only family
DROP POLICY IF EXISTS "icons public read" ON storage.objects;
CREATE POLICY "icons public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('game-icons','enemy-images'));
DROP POLICY IF EXISTS "icons family write" ON storage.objects;
CREATE POLICY "icons family write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('game-icons','enemy-images') AND public.is_family_member());
CREATE POLICY "icons family update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('game-icons','enemy-images') AND public.is_family_member());
CREATE POLICY "icons family delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('game-icons','enemy-images') AND public.is_family_member());
