
-- Drop dangerous public storage policies (allowed any anon to write/update/delete)
DROP POLICY IF EXISTS "captures public insert" ON storage.objects;
DROP POLICY IF EXISTS "captures public update" ON storage.objects;
DROP POLICY IF EXISTS "captures public delete" ON storage.objects;
DROP POLICY IF EXISTS "enemy-images open write" ON storage.objects;
DROP POLICY IF EXISTS "enemy-images open update" ON storage.objects;
DROP POLICY IF EXISTS "enemy-images open delete" ON storage.objects;
DROP POLICY IF EXISTS "enemy-images public read" ON storage.objects;
DROP POLICY IF EXISTS "game-icons read" ON storage.objects;
DROP POLICY IF EXISTS "game-icons write" ON storage.objects;
DROP POLICY IF EXISTS "game-icons update" ON storage.objects;
DROP POLICY IF EXISTS "game-icons delete" ON storage.objects;

-- Make captures bucket private (sensitive radar captures)
UPDATE storage.buckets SET public = false WHERE id = 'captures';

-- Authenticated family members can read/write/delete their own captures-folder content
-- (writes/deletes already covered by existing "captures auth read" / "captures auth write".)
DROP POLICY IF EXISTS "captures auth update" ON storage.objects;
DROP POLICY IF EXISTS "captures auth delete" ON storage.objects;
CREATE POLICY "captures auth update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'captures' AND public.is_family_member())
  WITH CHECK (bucket_id = 'captures' AND public.is_family_member());
CREATE POLICY "captures auth delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'captures' AND public.is_family_member());

-- Lock down SECURITY DEFINER functions: revoke from anon, allow authenticated only
REVOKE EXECUTE ON FUNCTION public.current_agent_key() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_family_member() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.adjust_pikmin(integer, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_agent_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_pikmin(integer, text, text, jsonb) TO authenticated;
-- handle_new_user is invoked by the auth trigger, not callable directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
