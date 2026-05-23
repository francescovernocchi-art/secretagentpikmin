
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
