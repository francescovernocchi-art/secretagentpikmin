
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family members can receive realtime" ON realtime.messages;
CREATE POLICY "family members can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.is_family_member());
