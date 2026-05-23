
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family read invites" ON public.invite_codes
  FOR SELECT TO authenticated USING (public.is_family_member());

-- Validate + consume a code atomically. SECURITY DEFINER so it bypasses RLS
-- for the just-signed-up user who is not yet a "family member".
CREATE OR REPLACE FUNCTION public.consume_invite_code(_code text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.invite_codes
  WHERE code = _code
    AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.invite_codes
  SET used_by = _user_id, used_at = now()
  WHERE id = v_id;

  RETURN true;
END;
$$;

-- Generate a new invite code (Comandante only).
CREATE OR REPLACE FUNCTION public.create_invite_code(_note text DEFAULT NULL, _expires_at timestamptz DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_code text;
BEGIN
  SELECT agent_key INTO v_role FROM public.profiles WHERE user_id = auth.uid();
  IF v_role IS DISTINCT FROM 'papa' THEN
    RAISE EXCEPTION 'Solo i Comandanti possono creare inviti';
  END IF;

  v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  INSERT INTO public.invite_codes (code, created_by, note, expires_at)
  VALUES (v_code, auth.uid(), _note, _expires_at);

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invite_code(text, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_invite_code(text, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.consume_invite_code(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text, uuid) TO anon, authenticated;
