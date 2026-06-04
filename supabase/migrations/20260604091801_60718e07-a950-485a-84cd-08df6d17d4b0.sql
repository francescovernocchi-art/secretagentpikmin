
-- Replace permissive "family open" policies with family-member reads and owner-scoped writes.

-- Helper: drop policy if exists
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bestiary_entries','pikmin_activity_log','biome_zones','family_chat_messages',
    'family_members','family_trade_offers','family_trade_items','family_trade_history',
    'game_notifications','market_transactions','pikmin_specializations','spaceship_parts',
    'pikmin_units','pikmin_expedition_units','planet_status','player_inventory',
    'player_profiles','scan_results','villages','village_buildings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "family open" ON public.%I', t);
  END LOOP;
END $$;

-- ============== bestiary_entries (no owner col) ==============
CREATE POLICY "members read bestiary_entries" ON public.bestiary_entries FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members write bestiary_entries ins" ON public.bestiary_entries FOR INSERT TO authenticated WITH CHECK (public.is_family_member());
CREATE POLICY "members write bestiary_entries upd" ON public.bestiary_entries FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());
CREATE POLICY "members write bestiary_entries del" ON public.bestiary_entries FOR DELETE TO authenticated USING (public.is_family_member());

-- ============== pikmin_activity_log ==============
CREATE POLICY "members read pikmin_activity_log" ON public.pikmin_activity_log FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes pikmin_activity_log ins" ON public.pikmin_activity_log FOR INSERT TO authenticated WITH CHECK (owner_agent = (public.current_agent_key())::text);

-- ============== biome_zones (catalog) ==============
CREATE POLICY "members read biome_zones" ON public.biome_zones FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members write biome_zones ins" ON public.biome_zones FOR INSERT TO authenticated WITH CHECK (public.is_family_member());
CREATE POLICY "members write biome_zones upd" ON public.biome_zones FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());
CREATE POLICY "members write biome_zones del" ON public.biome_zones FOR DELETE TO authenticated USING (public.is_family_member());

-- ============== family_chat_messages ==============
CREATE POLICY "members read family_chat_messages" ON public.family_chat_messages FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes family_chat_messages ins" ON public.family_chat_messages FOR INSERT TO authenticated WITH CHECK (sender_agent = (public.current_agent_key())::text);

-- ============== family_members ==============
CREATE POLICY "members read family_members" ON public.family_members FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes family_members upd" ON public.family_members FOR UPDATE TO authenticated USING (agent_key = (public.current_agent_key())::text) WITH CHECK (agent_key = (public.current_agent_key())::text);
CREATE POLICY "own writes family_members ins" ON public.family_members FOR INSERT TO authenticated WITH CHECK (agent_key = (public.current_agent_key())::text);

-- ============== family_trade_offers ==============
CREATE POLICY "members read family_trade_offers" ON public.family_trade_offers FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes family_trade_offers ins" ON public.family_trade_offers FOR INSERT TO authenticated WITH CHECK (from_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes family_trade_offers upd" ON public.family_trade_offers FOR UPDATE TO authenticated USING (from_agent = (public.current_agent_key())::text OR to_agent = (public.current_agent_key())::text) WITH CHECK (from_agent = (public.current_agent_key())::text OR to_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes family_trade_offers del" ON public.family_trade_offers FOR DELETE TO authenticated USING (from_agent = (public.current_agent_key())::text);

-- ============== family_trade_items ==============
CREATE POLICY "members read family_trade_items" ON public.family_trade_items FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes family_trade_items ins" ON public.family_trade_items FOR INSERT TO authenticated WITH CHECK (agent_key = (public.current_agent_key())::text);
CREATE POLICY "own writes family_trade_items upd" ON public.family_trade_items FOR UPDATE TO authenticated USING (agent_key = (public.current_agent_key())::text) WITH CHECK (agent_key = (public.current_agent_key())::text);
CREATE POLICY "own writes family_trade_items del" ON public.family_trade_items FOR DELETE TO authenticated USING (agent_key = (public.current_agent_key())::text);

-- ============== family_trade_history ==============
CREATE POLICY "members read family_trade_history" ON public.family_trade_history FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes family_trade_history ins" ON public.family_trade_history FOR INSERT TO authenticated WITH CHECK (from_agent = (public.current_agent_key())::text OR to_agent = (public.current_agent_key())::text);

-- ============== game_notifications ==============
CREATE POLICY "members read game_notifications" ON public.game_notifications FOR SELECT TO authenticated USING (agent_key = (public.current_agent_key())::text);
CREATE POLICY "members write game_notifications ins" ON public.game_notifications FOR INSERT TO authenticated WITH CHECK (public.is_family_member());
CREATE POLICY "own writes game_notifications upd" ON public.game_notifications FOR UPDATE TO authenticated USING (agent_key = (public.current_agent_key())::text) WITH CHECK (agent_key = (public.current_agent_key())::text);
CREATE POLICY "own writes game_notifications del" ON public.game_notifications FOR DELETE TO authenticated USING (agent_key = (public.current_agent_key())::text);

-- ============== market_transactions ==============
CREATE POLICY "members read market_transactions" ON public.market_transactions FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes market_transactions ins" ON public.market_transactions FOR INSERT TO authenticated WITH CHECK (agent_key = (public.current_agent_key())::text);

-- ============== pikmin_specializations (catalog) ==============
CREATE POLICY "members read pikmin_specializations" ON public.pikmin_specializations FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members write pikmin_specializations ins" ON public.pikmin_specializations FOR INSERT TO authenticated WITH CHECK (public.is_family_member());
CREATE POLICY "members write pikmin_specializations upd" ON public.pikmin_specializations FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());
CREATE POLICY "members write pikmin_specializations del" ON public.pikmin_specializations FOR DELETE TO authenticated USING (public.is_family_member());

-- ============== spaceship_parts (shared game state) ==============
CREATE POLICY "members read spaceship_parts" ON public.spaceship_parts FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members write spaceship_parts ins" ON public.spaceship_parts FOR INSERT TO authenticated WITH CHECK (public.is_family_member());
CREATE POLICY "members write spaceship_parts upd" ON public.spaceship_parts FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());

-- ============== pikmin_units ==============
CREATE POLICY "members read pikmin_units" ON public.pikmin_units FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes pikmin_units ins" ON public.pikmin_units FOR INSERT TO authenticated WITH CHECK (owner_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes pikmin_units upd" ON public.pikmin_units FOR UPDATE TO authenticated USING (owner_agent = (public.current_agent_key())::text) WITH CHECK (owner_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes pikmin_units del" ON public.pikmin_units FOR DELETE TO authenticated USING (owner_agent = (public.current_agent_key())::text);

-- ============== pikmin_expedition_units ==============
CREATE POLICY "members read pikmin_expedition_units" ON public.pikmin_expedition_units FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes pikmin_expedition_units ins" ON public.pikmin_expedition_units FOR INSERT TO authenticated WITH CHECK (owner_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes pikmin_expedition_units upd" ON public.pikmin_expedition_units FOR UPDATE TO authenticated USING (owner_agent = (public.current_agent_key())::text) WITH CHECK (owner_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes pikmin_expedition_units del" ON public.pikmin_expedition_units FOR DELETE TO authenticated USING (owner_agent = (public.current_agent_key())::text);

-- ============== planet_status (shared global) ==============
CREATE POLICY "members read planet_status" ON public.planet_status FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "members write planet_status ins" ON public.planet_status FOR INSERT TO authenticated WITH CHECK (public.is_family_member());
CREATE POLICY "members write planet_status upd" ON public.planet_status FOR UPDATE TO authenticated USING (public.is_family_member()) WITH CHECK (public.is_family_member());

-- ============== player_inventory ==============
CREATE POLICY "members read player_inventory" ON public.player_inventory FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes player_inventory ins" ON public.player_inventory FOR INSERT TO authenticated WITH CHECK (agent_key = (public.current_agent_key())::text);
CREATE POLICY "own writes player_inventory upd" ON public.player_inventory FOR UPDATE TO authenticated USING (agent_key = (public.current_agent_key())::text) WITH CHECK (agent_key = (public.current_agent_key())::text);
CREATE POLICY "own writes player_inventory del" ON public.player_inventory FOR DELETE TO authenticated USING (agent_key = (public.current_agent_key())::text);

-- ============== player_profiles ==============
CREATE POLICY "members read player_profiles" ON public.player_profiles FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes player_profiles ins" ON public.player_profiles FOR INSERT TO authenticated WITH CHECK (agent_key = (public.current_agent_key())::text);
CREATE POLICY "own writes player_profiles upd" ON public.player_profiles FOR UPDATE TO authenticated USING (agent_key = (public.current_agent_key())::text) WITH CHECK (agent_key = (public.current_agent_key())::text);

-- ============== scan_results ==============
CREATE POLICY "members read scan_results" ON public.scan_results FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes scan_results ins" ON public.scan_results FOR INSERT TO authenticated WITH CHECK (agent_key = (public.current_agent_key())::text);

-- ============== villages ==============
CREATE POLICY "members read villages" ON public.villages FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes villages ins" ON public.villages FOR INSERT TO authenticated WITH CHECK (owner_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes villages upd" ON public.villages FOR UPDATE TO authenticated USING (owner_agent = (public.current_agent_key())::text) WITH CHECK (owner_agent = (public.current_agent_key())::text);
CREATE POLICY "own writes villages del" ON public.villages FOR DELETE TO authenticated USING (owner_agent = (public.current_agent_key())::text);

-- ============== village_buildings (scoped via parent villages.owner_agent) ==============
CREATE POLICY "members read village_buildings" ON public.village_buildings FOR SELECT TO authenticated USING (public.is_family_member());
CREATE POLICY "own writes village_buildings ins" ON public.village_buildings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.villages v WHERE v.id = village_buildings.village_id AND v.owner_agent = (public.current_agent_key())::text)
);
CREATE POLICY "own writes village_buildings upd" ON public.village_buildings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.villages v WHERE v.id = village_buildings.village_id AND v.owner_agent = (public.current_agent_key())::text)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.villages v WHERE v.id = village_buildings.village_id AND v.owner_agent = (public.current_agent_key())::text)
);
CREATE POLICY "own writes village_buildings del" ON public.village_buildings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.villages v WHERE v.id = village_buildings.village_id AND v.owner_agent = (public.current_agent_key())::text)
);
